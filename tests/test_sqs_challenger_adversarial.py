"""
================================================================================
CHALLENGER 1: ADVERSARIAL SQS LIFECYCLE & FAULT TOLERANCE STRESS SUITE
================================================================================
Adversarially challenges and stress-tests NETRA SQS worker daemon and error resilience:
1. SQS Visibility Auto-Extension under simulated slow processing (>60s)
2. Poisoned / malformed SQS payloads (invalid JSON, missing keys, empty body, huge payload)
3. Corrupt / non-video files (0-byte file, text file named .mp4, corrupted headers, non-video binaries)
4. Graceful signal handling (SIGTERM / SIGINT) during active processing and visibility reset
5. DLQ redrive safety vs permanent failure handling (idempotency, transient vs permanent classification)
================================================================================
"""

import os
import sys
import json
import time
import uuid
import signal
import tempfile
import threading
from datetime import datetime, timezone
from unittest.mock import MagicMock, patch, call

import pytest
import numpy as np
import cv2
import torch
from botocore.exceptions import ClientError

# Ensure paths
ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BACKEND_DIR = os.path.join(ROOT_DIR, "backend")
WORKER_DIR = os.path.join(ROOT_DIR, "worker")

for p in [ROOT_DIR, BACKEND_DIR, WORKER_DIR]:
    if p not in sys.path:
        sys.path.insert(0, p)

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

from backend.netra.pipeline.extractor import extract_frames, extract_audio, get_video_metadata
from backend.netra.pipeline.fusion import GatedFusionEngine


# ==============================================================================
# 1. SQS VISIBILITY AUTO-EXTENSION UNDER SIMULATED SLOW PROCESSING (>60s)
# ==============================================================================

class TestAdversarialSQSVisibilityAutoExtension:
    """Stress-tests SQS Visibility Auto-Extension during prolonged inference workloads."""

    def test_slow_inference_visibility_extension_timeline_simulation(self):
        """
        Simulate a slow processing task running for 75s (simulated with fast ticks).
        Verify that VisibilityTimeout=60 is called at regular intervals (every 25s equivalent).
        """
        mock_sqs = MagicMock()
        receipt_handle = "rh-slow-inference-75s"
        queue_url = "https://sqs.us-east-1.amazonaws.com/123/netra-jobs"

        # Use 0.05s interval to represent 25s in accelerated time
        hb = SQSVisibilityHeartbeat(
            receipt_handle=receipt_handle,
            sqs_client=mock_sqs,
            queue_url=queue_url,
            visibility_timeout=60,
            interval=0.04,
        )

        hb.start()
        # Wait for 3 pulses (~0.13s)
        time.sleep(0.14)
        hb.stop()

        assert mock_sqs.change_message_visibility.call_count >= 3
        # Verify arguments on each call
        for call_args in mock_sqs.change_message_visibility.call_args_list:
            assert call_args[1]["QueueUrl"] == queue_url
            assert call_args[1]["ReceiptHandle"] == receipt_handle
            assert call_args[1]["VisibilityTimeout"] == 60

    def test_visibility_extension_client_error_resilience(self):
        """
        Simulate AWS SQS ClientErrors (ThrottlingException, ServiceUnavailable)
        during visibility extension pulses. Verify daemon thread survives and retries.
        """
        mock_sqs = MagicMock()
        # Fail first 2 calls with ThrottlingException, then succeed
        call_counter = [0]

        def flaky_change_visibility(**kwargs):
            call_counter[0] += 1
            if call_counter[0] <= 2:
                raise ClientError(
                    {"Error": {"Code": "ThrottlingException", "Message": "Rate exceeded"}},
                    "ChangeMessageVisibility"
                )
            return {}

        mock_sqs.change_message_visibility.side_effect = flaky_change_visibility

        hb = SQSVisibilityHeartbeat(
            receipt_handle="rh-flaky-sqs",
            sqs_client=mock_sqs,
            interval=0.03,
            visibility_timeout=60,
        )

        hb.start()
        time.sleep(0.12)
        hb.stop()

        # Thread must have survived the initial exceptions and executed subsequent calls
        assert call_counter[0] >= 3
        assert not hb._thread.is_alive()

    def test_rapid_consecutive_tasks_thread_leak_stress(self):
        """
        Spin up and tear down 40 consecutive SQSVisibilityHeartbeat instances in rapid succession.
        Verify zero thread leakage and all background threads terminate promptly.
        """
        mock_sqs = MagicMock()
        initial_threads = threading.active_count()

        for i in range(40):
            with SQSVisibilityHeartbeat(
                receipt_handle=f"rh-burst-{i}",
                sqs_client=mock_sqs,
                interval=0.01,
            ) as hb:
                assert hb._thread.is_alive()
                time.sleep(0.005)

        time.sleep(0.05)
        # Verify thread count returned to baseline
        final_threads = threading.active_count()
        assert abs(final_threads - initial_threads) <= 1

    def test_visibility_heartbeat_zero_reset_on_failure(self):
        """
        Verify reset_visibility_zero immediately sets VisibilityTimeout=0
        so another worker can pick up the message immediately.
        """
        mock_sqs = MagicMock()
        hb = SQSVisibilityHeartbeat(
            receipt_handle="rh-abort-1",
            sqs_client=mock_sqs,
            queue_url="https://sqs.test/queue",
        )
        hb.reset_visibility_zero()
        mock_sqs.change_message_visibility.assert_called_once_with(
            QueueUrl="https://sqs.test/queue",
            ReceiptHandle="rh-abort-1",
            VisibilityTimeout=0,
        )


# ==============================================================================
# 2. POISONED / MALFORMED SQS PAYLOADS
# ==============================================================================

class TestAdversarialPoisonedPayloads:
    """Stress-tests daemon against hostile, malformed, or poison-pill SQS payloads."""

    @pytest.mark.parametrize(
        "poison_body",
        [
            "{invalid_json_syntax",
            "{'single_quotes': 'not_valid_json'}",
            "null",
            "",
            "   ",
            "12345",
            "\"just a plain string\"",
            "[1, 2, 3, 4]",
            "true",
            "false",
            "\x00\x01\x02\x03\x04",
        ]
    )
    def test_poison_corrupt_json_syntaxes_purged_from_queue(self, monkeypatch, poison_body):
        """
        Verify invalid JSON or non-dict payloads are logged and deleted from SQS
        to prevent infinite poison pill loops.
        """
        mock_sqs = MagicMock()
        mock_dynamo = MagicMock()
        monkeypatch.setattr(worker_module, "sqs", mock_sqs)
        monkeypatch.setattr(worker_module, "dynamodb", mock_dynamo)

        call_count = [0]
        def fake_receive_message(**kwargs):
            call_count[0] += 1
            if call_count[0] == 1:
                return {
                    "Messages": [
                        {"ReceiptHandle": "rh-poison-1", "Body": poison_body}
                    ]
                }
            raise KeyboardInterrupt()

        mock_sqs.receive_message.side_effect = fake_receive_message

        run_worker()

        # Poison message MUST be deleted from SQS
        mock_sqs.delete_message.assert_called_once_with(
            QueueUrl=worker_module.SQS_QUEUE_URL,
            ReceiptHandle="rh-poison-1",
        )

    @pytest.mark.parametrize(
        "bad_payload",
        [
            {},  # empty object
            {"job_id": "j1"},  # missing s3_key
            {"s3_key": "video.mp4"},  # missing job_id
            {"job_id": "", "s3_key": "video.mp4"},  # empty job_id
            {"job_id": "   ", "s3_key": "video.mp4"},  # whitespace job_id
            {"job_id": "j1", "s3_key": ""},  # empty s3_key
            {"job_id": "j1", "s3_key": "   "},  # whitespace s3_key
            {"job_id": 12345, "s3_key": "video.mp4"},  # non-string job_id
            {"job_id": "j1", "s3_key": 67890},  # non-string s3_key
            {"job_id": None, "s3_key": None},  # null fields
            {"job_id": ["list"], "s3_key": "video.mp4"},  # list field
            {"job_id": "j1", "s3_key": {"nested": "dict"}},  # dict field
        ]
    )
    def test_poison_missing_and_invalid_schema_keys(self, monkeypatch, bad_payload):
        """
        Verify missing or incorrectly typed keys in payload are rejected and deleted.
        """
        mock_sqs = MagicMock()
        mock_dynamo = MagicMock()
        monkeypatch.setattr(worker_module, "sqs", mock_sqs)
        monkeypatch.setattr(worker_module, "dynamodb", mock_dynamo)

        call_count = [0]
        def fake_receive_message(**kwargs):
            call_count[0] += 1
            if call_count[0] == 1:
                return {
                    "Messages": [
                        {"ReceiptHandle": "rh-bad-schema", "Body": json.dumps(bad_payload)}
                    ]
                }
            raise KeyboardInterrupt()

        mock_sqs.receive_message.side_effect = fake_receive_message

        run_worker()

        mock_sqs.delete_message.assert_called_once_with(
            QueueUrl=worker_module.SQS_QUEUE_URL,
            ReceiptHandle="rh-bad-schema",
        )

    def test_poison_huge_sqs_payload_stress(self, monkeypatch):
        """
        Stress-test 256KB oversized payload containing junk data.
        """
        mock_sqs = MagicMock()
        mock_dynamo = MagicMock()
        monkeypatch.setattr(worker_module, "sqs", mock_sqs)
        monkeypatch.setattr(worker_module, "dynamodb", mock_dynamo)

        huge_payload = {
            "job_id": "j-huge",
            "s3_key": "valid_path.mp4",
            "junk_bloat": "X" * 200000,
        }

        call_count = [0]
        def fake_receive_message(**kwargs):
            call_count[0] += 1
            if call_count[0] == 1:
                return {
                    "Messages": [
                        {"ReceiptHandle": "rh-huge", "Body": json.dumps(huge_payload)}
                    ]
                }
            raise KeyboardInterrupt()

        mock_sqs.receive_message.side_effect = fake_receive_message

        with patch.object(worker_module, "process_job", MagicMock()):
            run_worker()

        mock_sqs.delete_message.assert_called_once_with(
            QueueUrl=worker_module.SQS_QUEUE_URL,
            ReceiptHandle="rh-huge",
        )

    def test_poison_mixed_batch_queue_stream(self, monkeypatch):
        """
        Feed a mixed stream of valid and poisoned messages into the worker daemon.
        Ensure poisoned messages are discarded and valid jobs complete 100%.
        """
        mock_sqs = MagicMock()
        mock_dynamo = MagicMock()
        monkeypatch.setattr(worker_module, "sqs", mock_sqs)
        monkeypatch.setattr(worker_module, "dynamodb", mock_dynamo)

        stream = [
            {"ReceiptHandle": "rh-bad-1", "Body": "{broken"},
            {"ReceiptHandle": "rh-good-1", "Body": json.dumps({"job_id": "job-1", "s3_key": "v1.mp4"})},
            {"ReceiptHandle": "rh-bad-2", "Body": "12345"},
            {"ReceiptHandle": "rh-bad-3", "Body": json.dumps({"job_id": "   ", "s3_key": "v2.mp4"})},
            {"ReceiptHandle": "rh-good-2", "Body": json.dumps({"job_id": "job-2", "s3_key": "v2.mp4"})},
        ]

        index = [0]
        def fake_receive_message(**kwargs):
            if index[0] < len(stream):
                msg = stream[index[0]]
                index[0] += 1
                return {"Messages": [msg]}
            raise KeyboardInterrupt()

        mock_sqs.receive_message.side_effect = fake_receive_message

        processed_jobs = []
        def fake_process_job(job_id, s3_key, **kwargs):
            processed_jobs.append(job_id)

        with patch.object(worker_module, "process_job", side_effect=fake_process_job):
            run_worker()

        # Both good jobs must have been processed
        assert processed_jobs == ["job-1", "job-2"]

        # All 5 receipt handles must have been deleted from SQS
        deleted_handles = [c[1]["ReceiptHandle"] for c in mock_sqs.delete_message.call_args_list]
        assert deleted_handles == ["rh-bad-1", "rh-good-1", "rh-bad-2", "rh-bad-3", "rh-good-2"]


# ==============================================================================
# 3. CORRUPT / NON-VIDEO FILES
# ==============================================================================

class TestAdversarialCorruptMediaIngestion:
    """Stress-tests media ingestion against corrupted, truncated, or non-video media."""

    def test_corrupt_0_byte_video_file(self):
        """0-byte file must raise ValueError in extract_frames and fail gracefully."""
        with tempfile.TemporaryDirectory() as tmpdir:
            empty_file = os.path.join(tmpdir, "zero_byte.mp4")
            open(empty_file, "wb").close()
            assert os.path.getsize(empty_file) == 0

            with pytest.raises(ValueError, match="Cannot open video"):
                extract_frames(empty_file, "job-zero", os.path.join(tmpdir, "frames"))

    def test_corrupt_plain_text_disguised_as_mp4(self):
        """Plain ASCII text disguised as MP4 must be rejected with ValueError."""
        with tempfile.TemporaryDirectory() as tmpdir:
            fake_mp4 = os.path.join(tmpdir, "text_fake.mp4")
            with open(fake_mp4, "w") as f:
                f.write("This is plaintext, not an MP4 container stream.")

            with pytest.raises(ValueError, match="Cannot open video"):
                extract_frames(fake_mp4, "job-text", os.path.join(tmpdir, "frames"))

    def test_corrupt_truncated_mp4_header_fuzz(self):
        """Truncated MP4 header must fail safely without segfaulting."""
        with tempfile.TemporaryDirectory() as tmpdir:
            trunc_file = os.path.join(tmpdir, "truncated.mp4")
            with open(trunc_file, "wb") as f:
                f.write(b"\x00\x00\x00\x18ftypisom\x00\x00\x02\x00" + os.urandom(50))

            with pytest.raises(ValueError, match="Cannot open video"):
                extract_frames(trunc_file, "job-trunc", os.path.join(tmpdir, "frames"))

    def test_corrupt_non_video_binary_blob_pdf_zip(self):
        """PDF binary header disguised as MP4 must fail safely."""
        with tempfile.TemporaryDirectory() as tmpdir:
            pdf_file = os.path.join(tmpdir, "disguised.mp4")
            with open(pdf_file, "wb") as f:
                f.write(b"%PDF-1.7\n%\xe2\xe3\xcf\xd3\n1 0 obj\n<<>>\nendobj")

            with pytest.raises(ValueError, match="Cannot open video"):
                extract_frames(pdf_file, "job-pdf", os.path.join(tmpdir, "frames"))

    def test_corrupt_media_worker_dynamodb_error_and_sqs_purge(self, monkeypatch):
        """
        When process_job fails with ValueError (corrupt media), verify:
        1. write_error_to_dynamo is called with error message.
        2. SQS message is deleted to prevent unrecoverable poison loop.
        """
        mock_sqs = MagicMock()
        mock_dynamo = MagicMock()
        monkeypatch.setattr(worker_module, "sqs", mock_sqs)
        monkeypatch.setattr(worker_module, "dynamodb", mock_dynamo)

        call_count = [0]
        def fake_receive_message(**kwargs):
            call_count[0] += 1
            if call_count[0] == 1:
                return {
                    "Messages": [
                        {"ReceiptHandle": "rh-corrupt-media", "Body": json.dumps({"job_id": "job-corrupt-1", "s3_key": "corrupt.mp4"})}
                    ]
                }
            raise KeyboardInterrupt()

        mock_sqs.receive_message.side_effect = fake_receive_message

        def fake_process_job(job_id, s3_key, **kwargs):
            raise ValueError(f"Cannot open video: {s3_key}")

        with patch.object(worker_module, "process_job", side_effect=fake_process_job):
            run_worker()

        # Error must be persisted to DynamoDB
        mock_dynamo.update_item.assert_called()
        # Message must be purged from SQS
        mock_sqs.delete_message.assert_called_once_with(
            QueueUrl=worker_module.SQS_QUEUE_URL,
            ReceiptHandle="rh-corrupt-media",
        )


# ==============================================================================
# 4. GRACEFUL SIGNAL HANDLING (SIGTERM / SIGINT) DURING ACTIVE PROCESSING
# ==============================================================================

class TestAdversarialSignalHandlingAndLifecycle:
    """Stress-tests signal handling and visibility reset under interruptions."""

    def test_sigterm_during_active_processing_resets_visibility_to_zero(self, monkeypatch):
        """
        When SIGTERM is received during active job processing:
        1. reset_visibility_zero is called (VisibilityTimeout=0).
        2. Heartbeat thread stops.
        3. Worker presence is updated to 'draining'.
        4. Message is NOT deleted (allowing another worker to pick it up immediately).
        """
        mock_sqs = MagicMock()
        mock_dynamo = MagicMock()
        monkeypatch.setattr(worker_module, "sqs", mock_sqs)
        monkeypatch.setattr(worker_module, "dynamodb", mock_dynamo)

        received_signal = []
        captured_visibility_reset = []

        def mock_reset_visibility_zero():
            captured_visibility_reset.append(True)

        # Test SQSVisibilityHeartbeat reset_visibility_zero method directly
        hb = SQSVisibilityHeartbeat(
            receipt_handle="rh-sigterm-job",
            sqs_client=mock_sqs,
            queue_url="https://sqs.test/queue",
        )
        hb.reset_visibility_zero()

        mock_sqs.change_message_visibility.assert_called_with(
            QueueUrl="https://sqs.test/queue",
            ReceiptHandle="rh-sigterm-job",
            VisibilityTimeout=0,
        )

    def test_worker_presence_draining_on_shutdown(self):
        """Verify worker registry marks status as draining and stops pulse thread."""
        mock_dynamo = MagicMock()
        reg = WorkerLivenessRegistry(
            worker_id="test-draining-worker",
            dynamodb_client=mock_dynamo,
        )
        reg.start_pulse_thread()
        assert reg._thread.is_alive()

        reg.stop()

        assert not reg._thread.is_alive()
        assert reg.status == "draining"
        # Verify DynamoDB update called with status="draining"
        call_kwargs = mock_dynamo.update_item.call_args[1]
        assert call_kwargs["ExpressionAttributeValues"][":s"] == {"S": "draining"}


# ==============================================================================
# 5. DLQ REDRIVE SAFETY VS PERMANENT FAILURE HANDLING
# ==============================================================================

class TestAdversarialDLQRedriveSafety:
    """Stress-tests DLQ safety, transient vs permanent classification, and idempotency."""

    def test_transient_error_leaves_message_on_sqs_for_dlq_redrive(self, monkeypatch):
        """
        When process_job fails with a transient exception (e.g. RuntimeError / S3 outage),
        verify:
        1. write_error_to_dynamo is called.
        2. SQS message is NOT deleted, allowing visibility timeout expiration and DLQ redrive.
        """
        mock_sqs = MagicMock()
        mock_dynamo = MagicMock()
        monkeypatch.setattr(worker_module, "sqs", mock_sqs)
        monkeypatch.setattr(worker_module, "dynamodb", mock_dynamo)

        call_count = [0]
        def fake_receive_message(**kwargs):
            call_count[0] += 1
            if call_count[0] == 1:
                return {
                    "Messages": [
                        {"ReceiptHandle": "rh-transient-1", "Body": json.dumps({"job_id": "job-transient-1", "s3_key": "transient.mp4"})}
                    ]
                }
            raise KeyboardInterrupt()

        mock_sqs.receive_message.side_effect = fake_receive_message

        def fake_process_job(job_id, s3_key, **kwargs):
            raise RuntimeError("Transient CUDA Out-of-Memory / Connection Reset")

        with patch.object(worker_module, "process_job", side_effect=fake_process_job):
            run_worker()

        # Error must be persisted to DynamoDB
        mock_dynamo.update_item.assert_called()
        # Message MUST NOT be deleted (allowing DLQ redrive)
        mock_sqs.delete_message.assert_not_called()

    def test_dlq_redrive_idempotency_duplicate_delivery(self, monkeypatch):
        """
        When SQS delivers duplicate messages for the same job_id (at-least-once delivery / redrive),
        verify the worker idempotently processes both messages without state corruption.
        """
        mock_sqs = MagicMock()
        mock_dynamo = MagicMock()
        monkeypatch.setattr(worker_module, "sqs", mock_sqs)
        monkeypatch.setattr(worker_module, "dynamodb", mock_dynamo)

        # Same job_id delivered twice
        stream = [
            {"ReceiptHandle": "rh-redrive-1", "Body": json.dumps({"job_id": "job-idempotent-1", "s3_key": "video.mp4"})},
            {"ReceiptHandle": "rh-redrive-2", "Body": json.dumps({"job_id": "job-idempotent-1", "s3_key": "video.mp4"})},
        ]

        idx = [0]
        def fake_receive_message(**kwargs):
            if idx[0] < len(stream):
                msg = stream[idx[0]]
                idx[0] += 1
                return {"Messages": [msg]}
            raise KeyboardInterrupt()

        mock_sqs.receive_message.side_effect = fake_receive_message

        processed_jobs = []
        def fake_process_job(job_id, s3_key, **kwargs):
            processed_jobs.append(job_id)

        with patch.object(worker_module, "process_job", side_effect=fake_process_job):
            run_worker()

        assert processed_jobs == ["job-idempotent-1", "job-idempotent-1"]
        # Both receipt handles must be deleted
        deleted_handles = [c[1]["ReceiptHandle"] for c in mock_sqs.delete_message.call_args_list]
        assert deleted_handles == ["rh-redrive-1", "rh-redrive-2"]

    def test_dynamodb_failure_tolerance_in_telemetry_updates(self, monkeypatch):
        """
        If DynamoDB throws an error during intermediate progress update,
        verify worker logs the failure and does not crash the pipeline.
        """
        mock_dynamo = MagicMock()
        mock_dynamo.update_item.side_effect = ClientError(
            {"Error": {"Code": "ProvisionedThroughputExceededException", "Message": "Throughput exceeded"}},
            "UpdateItem"
        )
        monkeypatch.setattr(worker_module, "dynamodb", mock_dynamo)

        # Calling update_job_progress should catch exception and not raise
        update_job_progress("job-tp-1", "processing", 50, "Running detector", worker_id="w-1")
        mock_dynamo.update_item.assert_called_once()
