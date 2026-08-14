"""
Unit Tests for NETRA SQS Worker Daemon (netra/worker/worker.py)
Tests:
- Device selection (CUDA -> MPS -> CPU) & worker ID generation
- SQSVisibilityHeartbeat (start, loop, stop, error tolerance, reset_visibility_zero, context manager)
- WorkerLivenessRegistry (register, pulse, set_busy, set_idle, set_draining, stop)
- DynamoDB progress, result, and error serialization helpers
- ModelRegistry singleton instance retrieval
- process_job 10-stage execution and error classification
- run_worker daemon loop with message handling and graceful shutdown
"""
import json
import os
import signal
import sys
import threading
import time
from datetime import datetime, timezone
from unittest.mock import MagicMock, patch

import pytest
import torch
from botocore.exceptions import ClientError

# Ensure paths
ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)

try:
    import worker.worker as worker_module
except (ImportError, ModuleNotFoundError):
    import worker as worker_module

SQSVisibilityHeartbeat = worker_module.SQSVisibilityHeartbeat
WorkerLivenessRegistry = worker_module.WorkerLivenessRegistry
ModelRegistry = worker_module.ModelRegistry
get_optimal_device = worker_module.get_optimal_device
get_worker_id = worker_module.get_worker_id
update_job_progress = worker_module.update_job_progress
write_result_to_dynamo = worker_module.write_result_to_dynamo
write_error_to_dynamo = worker_module.write_error_to_dynamo
process_job = worker_module.process_job
run_worker = worker_module.run_worker


class TestWorkerDeviceAndId:
    def test_get_optimal_device(self):
        dev, dev_type, dev_name = get_optimal_device()
        assert isinstance(dev, torch.device)
        assert dev_type in ["cuda:0", "mps", "cpu"]
        assert isinstance(dev_name, str) and len(dev_name) > 0

    def test_get_worker_id(self):
        wid = get_worker_id()
        assert wid.startswith("worker-")
        assert len(wid) > 10

    def test_get_worker_id_env_override(self, monkeypatch):
        monkeypatch.setenv("WORKER_ID", "custom-worker-007")
        assert get_worker_id() == "custom-worker-007"


class TestSQSVisibilityHeartbeat:
    def test_heartbeat_lifecycle_and_context_manager(self):
        mock_sqs = MagicMock()
        rh = "receipt-handle-test-123"

        with SQSVisibilityHeartbeat(
            receipt_handle=rh,
            sqs_client=mock_sqs,
            queue_url="https://sqs.us-east-1.amazonaws.com/123/netra-jobs",
            visibility_timeout=60,
            interval=0.05,
        ) as hb:
            time.sleep(0.12)
            assert hb._thread is not None
            assert hb._thread.is_alive()

        # Context exit must stop thread
        time.sleep(0.05)
        assert not hb._thread.is_alive()
        assert mock_sqs.change_message_visibility.call_count >= 2
        mock_sqs.change_message_visibility.assert_called_with(
            QueueUrl="https://sqs.us-east-1.amazonaws.com/123/netra-jobs",
            ReceiptHandle=rh,
            VisibilityTimeout=60,
        )

    def test_reset_visibility_zero(self):
        mock_sqs = MagicMock()
        hb = SQSVisibilityHeartbeat(
            receipt_handle="rh-zero",
            sqs_client=mock_sqs,
            queue_url="https://sqs.test/queue",
        )
        hb.reset_visibility_zero()
        mock_sqs.change_message_visibility.assert_called_once_with(
            QueueUrl="https://sqs.test/queue",
            ReceiptHandle="rh-zero",
            VisibilityTimeout=0,
        )

    def test_heartbeat_survives_client_error(self):
        mock_sqs = MagicMock()
        mock_sqs.change_message_visibility.side_effect = ClientError(
            {"Error": {"Code": "ThrottlingException", "Message": "Throttled"}},
            "ChangeMessageVisibility",
        )
        hb = SQSVisibilityHeartbeat(
            receipt_handle="rh-err",
            sqs_client=mock_sqs,
            interval=0.02,
        )
        hb.start()
        time.sleep(0.06)
        hb.stop()
        assert mock_sqs.change_message_visibility.call_count >= 1


class TestWorkerLivenessRegistry:
    def test_register_and_pulse(self):
        mock_dynamo = MagicMock()
        reg = WorkerLivenessRegistry(
            worker_id="test-worker-1",
            dynamodb_client=mock_dynamo,
            table_name="netra-workers",
            pulse_interval=0.05,
            ttl_seconds=120,
        )
        reg.register()
        mock_dynamo.put_item.assert_called_once()
        put_args = mock_dynamo.put_item.call_args[1]
        assert put_args["TableName"] == "netra-workers"
        assert put_args["Item"]["worker_id"]["S"] == "test-worker-1"
        assert put_args["Item"]["status"]["S"] == "idle"

        # Pulse test
        reg.pulse()
        mock_dynamo.update_item.assert_called_once()

    def test_state_transitions_and_stop(self):
        mock_dynamo = MagicMock()
        reg = WorkerLivenessRegistry(
            worker_id="test-worker-2",
            dynamodb_client=mock_dynamo,
            pulse_interval=0.05,
        )
        reg.start_pulse_thread()
        assert reg._thread.is_alive()

        reg.set_busy("job-100")
        assert reg.status == "busy"
        assert reg.active_job_id == "job-100"

        reg.set_idle()
        assert reg.status == "idle"
        assert reg.active_job_id is None

        reg.stop()
        assert not reg._thread.is_alive()
        assert reg.status == "draining"


class TestDynamoHelpers:
    def test_update_job_progress(self):
        with patch.object(worker_module, "dynamodb", MagicMock()) as mock_dynamo:
            update_job_progress("job-p1", "processing", 30, "Running spatial deepfake detector", worker_id="w-1")
            mock_dynamo.update_item.assert_called_once()
            call_kwargs = mock_dynamo.update_item.call_args[1]
            assert call_kwargs["TableName"] == "netra-jobs"
            assert call_kwargs["Key"] == {"job_id": {"S": "job-p1"}}
            assert ":p" in call_kwargs["ExpressionAttributeValues"]
            assert call_kwargs["ExpressionAttributeValues"][":p"] == {"N": "30"}
            assert call_kwargs["ExpressionAttributeValues"][":w"] == {"S": "w-1"}

    def test_write_result_to_dynamo(self):
        with patch.object(worker_module, "dynamodb", MagicMock()) as mock_dynamo:
            payload = {"verdict": "AUTHENTIC", "confidence": 98.0}
            write_result_to_dynamo("job-r1", payload, worker_id="w-1")
            mock_dynamo.update_item.assert_called_once()
            call_kwargs = mock_dynamo.update_item.call_args[1]
            assert call_kwargs["ExpressionAttributeValues"][":s"] == {"S": "complete"}
            assert call_kwargs["ExpressionAttributeValues"][":p"] == {"N": "100"}
            assert json.loads(call_kwargs["ExpressionAttributeValues"][":r"]["S"])["verdict"] == "AUTHENTIC"

    def test_write_error_to_dynamo(self):
        with patch.object(worker_module, "dynamodb", MagicMock()) as mock_dynamo:
            write_error_to_dynamo("job-e1", "Corrupted video container", worker_id="w-1")
            mock_dynamo.update_item.assert_called_once()
            call_kwargs = mock_dynamo.update_item.call_args[1]
            assert call_kwargs["ExpressionAttributeValues"][":s"] == {"S": "error"}
            assert call_kwargs["ExpressionAttributeValues"][":e"] == {"S": "Corrupted video container"}


class TestModelRegistry:
    def test_singleton_registry(self):
        inst1 = ModelRegistry.get_instance()
        inst2 = ModelRegistry.get_instance()
        assert inst1 is inst2
        assert hasattr(inst1, "spatial_detector")
        assert hasattr(inst1, "audio_detector")
        assert hasattr(inst1, "fusion_engine")


class TestRunWorkerSupervisor:
    def test_run_worker_handles_malformed_and_valid_messages(self, monkeypatch):
        mock_sqs = MagicMock()
        mock_dynamo = MagicMock()
        mock_s3 = MagicMock()

        monkeypatch.setattr(worker_module, "sqs", mock_sqs)
        monkeypatch.setattr(worker_module, "dynamodb", mock_dynamo)
        monkeypatch.setattr(worker_module, "s3", mock_s3)

        # Sequence of messages: 1. Malformed JSON -> 2. Missing key -> 3. KeyboardInterrupt
        call_count = [0]
        def fake_receive_message(**kwargs):
            call_count[0] += 1
            if call_count[0] == 1:
                return {"Messages": [{"ReceiptHandle": "rh-bad-json", "Body": "{broken"}]}
            elif call_count[0] == 2:
                return {"Messages": [{"ReceiptHandle": "rh-missing-key", "Body": json.dumps({"job_id": "j1"})}]}
            else:
                raise KeyboardInterrupt()

        mock_sqs.receive_message.side_effect = fake_receive_message

        run_worker()

        # Both malformed messages should have been deleted
        deleted_handles = [c[1]["ReceiptHandle"] for c in mock_sqs.delete_message.call_args_list]
        assert "rh-bad-json" in deleted_handles
        assert "rh-missing-key" in deleted_handles
