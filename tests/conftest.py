"""
Global pytest fixtures for NETRA backend test suite.
Ensures all tests are isolated from live AWS DynamoDB by default.
"""
import pytest
from unittest.mock import patch, MagicMock

from backend.api.routes.jobs import _local_jobs_store
from backend.api.routes.workers import _local_worker_registry


@pytest.fixture(autouse=True)
def isolate_aws_dynamodb():
    """
    Auto-use fixture that mocks all DynamoDB calls in the workers and jobs routers
    so that live AWS data never pollutes unit/integration tests.
    Tests can override by passing their own InMemDynamoDB via dependency injection.
    """
    mock_workers_dynamo = MagicMock()
    mock_workers_dynamo.scan.return_value = {"Items": []}
    mock_workers_dynamo.put_item.return_value = {}
    mock_workers_dynamo.update_item.return_value = {}
    mock_workers_dynamo.get_item.return_value = {}

    mock_jobs_dynamo = MagicMock()
    mock_jobs_dynamo.get_item.return_value = {"Item": None}
    mock_jobs_dynamo.put_item.return_value = {}
    mock_jobs_dynamo.update_item.return_value = {}

    with patch("backend.api.routes.workers.get_dynamo_client", return_value=mock_workers_dynamo), \
         patch("backend.api.routes.jobs.get_dynamo_client", return_value=mock_jobs_dynamo):
        yield
