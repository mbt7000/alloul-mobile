"""ALLOUL&Q — pytest fixtures."""
import os
os.environ.setdefault("DATABASE_URL", "sqlite:///./test.db")
os.environ.setdefault("SECRET_KEY", "test-secret-key-at-least-32-chars-long")
os.environ.setdefault("ENVIRONMENT", "test")
os.environ.setdefault("ALLOW_CREATE_ALL", "1")

import pytest
from fastapi.testclient import TestClient


@pytest.fixture
def client():
    from main import app
    with TestClient(app) as c:
        yield c
