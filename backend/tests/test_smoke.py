"""Smoke tests — basic health checks."""


def test_health_endpoint_exists(client):
    """The app should boot and have an openapi schema."""
    r = client.get("/openapi.json")
    assert r.status_code == 200
    data = r.json()
    assert data.get("info", {}).get("title")


def test_billing_routes_registered(client):
    """Verify Mission 5 billing routes are registered."""
    r = client.get("/openapi.json")
    paths = r.json().get("paths", {})
    assert any("/billing/" in p for p in paths.keys()), "billing routes missing"


def test_security_routes_registered(client):
    """Verify Mission 7 security routes are registered."""
    r = client.get("/openapi.json")
    paths = r.json().get("paths", {})
    assert any("/security/" in p for p in paths.keys()), "security routes missing"


def test_stories_routes_registered(client):
    r = client.get("/openapi.json")
    paths = r.json().get("paths", {})
    assert any("/stories" in p for p in paths.keys()), "stories routes missing"


def test_auth_routes_registered(client):
    r = client.get("/openapi.json")
    paths = r.json().get("paths", {})
    assert any("/auth/" in p for p in paths.keys()), "auth routes missing"
