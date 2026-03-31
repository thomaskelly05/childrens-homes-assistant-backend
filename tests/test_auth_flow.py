import os
from types import SimpleNamespace

import pyotp
import pytest
from fastapi.testclient import TestClient


# --------------------------------------------------------------------------
# Test environment defaults
# --------------------------------------------------------------------------

os.environ.setdefault("SESSION_SECRET", "test-session-secret")
os.environ.setdefault("OPENAI_API_KEY", "test-openai-key")
os.environ.setdefault("DATABASE_URL", "postgresql://test:test@localhost:5432/testdb")
os.environ.setdefault("APP_ENV", "development")


# Import after env is set
import app as app_module  # noqa: E402
import routers.auth_routes as auth_routes  # noqa: E402
import routers.mfa_routes as mfa_routes  # noqa: E402
import auth.current_user as current_user_module  # noqa: E402
import auth.legal_acceptance as legal_acceptance_module  # noqa: E402
import db.legal_acceptance_db as legal_acceptance_db  # noqa: E402


# --------------------------------------------------------------------------
# Shared fake state
# --------------------------------------------------------------------------

TEST_USER_ID = 5
TEST_EMAIL = "admin1@indicare.co.uk"
TEST_PASSWORD = "Password123!"
TEST_ROLE = "admin"
TEST_HOME_ID = 1
TEST_TOTP_SECRET = pyotp.random_base32()

fake_state = {
    "user": {
        "id": TEST_USER_ID,
        "email": TEST_EMAIL,
        "role": TEST_ROLE,
        "home_id": TEST_HOME_ID,
        "first_name": "Admin",
        "last_name": "User",
        "is_active": True,
        "archived": False,
        "password_hash": b"fake-hash-not-used-in-mocked-login",
        "updated_at": None,
        "created_at": None,
    },
    "billing": {
        "subscription_active": True,
        "subscription_status": "active",
        "plan_name": "Pro",
        "stripe_customer_id": None,
        "stripe_subscription_id": None,
        "current_period_end": None,
    },
    "mfa_enabled": False,
    "mfa_verified": False,
    "totp_secret": TEST_TOTP_SECRET,
    "recovery_codes": [],
    "accepted_legal": False,
}


# --------------------------------------------------------------------------
# Fixtures
# --------------------------------------------------------------------------

@pytest.fixture()
def client(monkeypatch):
    """
    Build a client with DB-heavy and external behaviours mocked so the tests
    exercise your route and middleware flow without needing a live DB.
    """

    # -----------------------------
    # App startup / shutdown mocks
    # -----------------------------
    monkeypatch.setattr(app_module, "init_db_pool", lambda: None)
    monkeypatch.setattr(app_module, "close_db_pool", lambda: None)
    monkeypatch.setattr(app_module, "init_legal_acceptance_table", lambda: None)
    monkeypatch.setattr(app_module, "init_mfa_tables", lambda: None)

    # -----------------------------
    # Health DB mocks
    # -----------------------------
    class DummyCursor:
        def __enter__(self):
            return self

        def __exit__(self, exc_type, exc, tb):
            return False

        def execute(self, *_args, **_kwargs):
            return None

        def fetchone(self):
            return {"ok": True}

    class DummyConn:
        closed = False

        def cursor(self, *args, **kwargs):
            return DummyCursor()

    monkeypatch.setattr(app_module, "get_db_connection", lambda: DummyConn())
    monkeypatch.setattr(app_module, "release_db_connection", lambda conn: None)

    # -----------------------------
    # Token / auth helpers
    # -----------------------------
    monkeypatch.setattr(
        auth_routes,
        "create_session_token",
        lambda user_id: f"test-token-{user_id}",
    )

    def fake_decode_session_token(token):
        if token == f"test-token-{TEST_USER_ID}":
            return {"sub": str(TEST_USER_ID)}
        return None

    monkeypatch.setattr(auth_routes, "decode_session_token", fake_decode_session_token)
    monkeypatch.setattr(app_module, "decode_session_token", fake_decode_session_token)
    monkeypatch.setattr(current_user_module, "decode_session_token", fake_decode_session_token)

    # -----------------------------
    # Fake DB dependency for routes
    # -----------------------------
    class FakeCursor:
        def __init__(self):
            self._result = None

        def __enter__(self):
            return self

        def __exit__(self, exc_type, exc, tb):
            return False

        def execute(self, query, params=None):
            q = " ".join(str(query).split()).lower()

            if "from users where lower(email)" in q:
                email = params[0]
                if email == TEST_EMAIL.lower():
                    self._result = fake_state["user"]
                else:
                    self._result = None
                return

            if "from users where id =" in q:
                user_id = params[0]
                if int(user_id) == TEST_USER_ID:
                    self._result = fake_state["user"]
                else:
                    self._result = None
                return

            self._result = None

        def fetchone(self):
            return self._result

    class FakeConn:
        closed = False

        def cursor(self, *args, **kwargs):
            return FakeCursor()

        def commit(self):
            return None

        def rollback(self):
            return None

    def fake_get_db():
        yield FakeConn()

    app_module.app.dependency_overrides[auth_routes.get_db] = fake_get_db
    app_module.app.dependency_overrides[current_user_module.get_db] = fake_get_db

    # -----------------------------
    # Password check mock
    # -----------------------------
    monkeypatch.setattr(
        auth_routes.bcrypt,
        "checkpw",
        lambda password, password_hash: password.decode("utf-8") == TEST_PASSWORD,
    )

    # -----------------------------
    # Billing mocks
    # -----------------------------
    monkeypatch.setattr(
        auth_routes,
        "get_user_billing_by_user_id",
        lambda conn, user_id: fake_state["billing"],
    )
    monkeypatch.setattr(
        current_user_module,
        "get_user_billing_by_user_id",
        lambda conn, user_id: fake_state["billing"],
    )

    # -----------------------------
    # MFA DB mocks
    # -----------------------------
    def fake_get_user_mfa(user_id):
        if int(user_id) != TEST_USER_ID:
            return None
        return {
            "user_id": TEST_USER_ID,
            "email": TEST_EMAIL,
            "totp_secret": fake_state["totp_secret"],
            "is_enabled": fake_state["mfa_enabled"],
        }

    def fake_upsert_user_mfa_secret(user_id, email, totp_secret):
        fake_state["totp_secret"] = totp_secret
        fake_state["mfa_enabled"] = False

    def fake_enable_user_mfa(user_id):
        fake_state["mfa_enabled"] = True

    def fake_update_last_verified(user_id):
        fake_state["mfa_verified"] = True

    def fake_generate_and_store_recovery_codes(user_id, count=8):
        codes = [f"CODE-{i}" for i in range(1, count + 1)]
        fake_state["recovery_codes"] = codes[:]
        return codes

    def fake_count_unused_recovery_codes(user_id):
        return len(fake_state["recovery_codes"])

    def fake_use_recovery_code(user_id, code):
        code = code.strip().upper()
        if code in fake_state["recovery_codes"]:
            fake_state["recovery_codes"].remove(code)
            fake_state["mfa_verified"] = True
            return True
        return False

    monkeypatch.setattr(auth_routes, "get_user_mfa", fake_get_user_mfa)
    monkeypatch.setattr(current_user_module, "get_user_mfa", fake_get_user_mfa)
    monkeypatch.setattr(app_module, "user_has_enabled_mfa", lambda user_id: fake_state["mfa_enabled"])

    monkeypatch.setattr(mfa_routes, "get_user_mfa", fake_get_user_mfa)
    monkeypatch.setattr(mfa_routes, "upsert_user_mfa_secret", fake_upsert_user_mfa_secret)
    monkeypatch.setattr(mfa_routes, "enable_user_mfa", fake_enable_user_mfa)
    monkeypatch.setattr(mfa_routes, "update_last_verified", fake_update_last_verified)
    monkeypatch.setattr(mfa_routes, "generate_and_store_recovery_codes", fake_generate_and_store_recovery_codes)
    monkeypatch.setattr(mfa_routes, "count_unused_recovery_codes", fake_count_unused_recovery_codes)
    monkeypatch.setattr(mfa_routes, "use_recovery_code", fake_use_recovery_code)
    monkeypatch.setattr(mfa_routes, "log_auth_event", lambda **kwargs: None)

    monkeypatch.setattr(auth_routes, "log_auth_event", lambda **kwargs: None)

    # -----------------------------
    # Legal acceptance mocks
    # -----------------------------
    def fake_has_user_accepted_version(user_id, version):
        return fake_state["accepted_legal"]

    monkeypatch.setattr(app_module, "has_user_accepted_version", fake_has_user_accepted_version)
    monkeypatch.setattr(legal_acceptance_module, "has_user_accepted_version", fake_has_user_accepted_version)
    monkeypatch.setattr(legal_acceptance_db, "has_user_accepted_version", fake_has_user_accepted_version)

    with TestClient(app_module.app) as test_client:
        yield test_client

    app_module.app.dependency_overrides.clear()

    # reset state between tests
    fake_state["mfa_enabled"] = False
    fake_state["mfa_verified"] = False
    fake_state["accepted_legal"] = False
    fake_state["recovery_codes"] = []
    fake_state["totp_secret"] = TEST_TOTP_SECRET


# --------------------------------------------------------------------------
# Tests
# --------------------------------------------------------------------------

def test_health(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["ok"] is True


def test_auth_check_logged_out(client):
    response = client.get("/auth/check")
    assert response.status_code == 200
    assert response.json()["authenticated"] is False


def test_assistant_redirects_to_login_when_logged_out(client):
    response = client.get("/assistant", follow_redirects=False)
    assert response.status_code in (302, 307)
    assert response.headers["location"] == "/login"


def test_login_success(client):
    response = client.post(
        "/auth/login",
        json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD,
            "remember": False,
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["ok"] is True
    assert body["mfa_required"] is True
    assert body["user"]["email"] == TEST_EMAIL
    assert body["user"]["role"] == TEST_ROLE


def test_auth_check_after_login(client):
    login = client.post(
        "/auth/login",
        json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD,
            "remember": False,
        },
    )
    assert login.status_code == 200

    check = client.get("/auth/check")
    assert check.status_code == 200
    body = check.json()
    assert body["authenticated"] is True
    assert body["user_id"] == TEST_USER_ID
    assert body["email"] == TEST_EMAIL
    assert body["mfa_enabled"] is False
    assert body["mfa_verified"] is False


def test_mfa_setup_returns_secret_and_qr(client):
    login = client.post(
        "/auth/login",
        json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD,
            "remember": False,
        },
    )
    assert login.status_code == 200

    setup = client.post("/auth/mfa/setup")
    assert setup.status_code == 200

    body = setup.json()
    assert body["ok"] is True
    assert body["secret"]
    assert body["otp_auth_url"].startswith("otpauth://")
    assert body["qr_code_data_url"].startswith("data:image/png;base64,")


def test_mfa_enable_then_auth_check_reflects_verified_session(client):
    login = client.post(
        "/auth/login",
        json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD,
            "remember": False,
        },
    )
    assert login.status_code == 200

    setup = client.post("/auth/mfa/setup")
    assert setup.status_code == 200
    secret = setup.json()["secret"]

    current_code = pyotp.TOTP(secret).now()

    enable = client.post(
        "/auth/mfa/enable",
        json={"code": current_code},
    )
    assert enable.status_code == 200
    body = enable.json()
    assert body["ok"] is True
    assert body["enabled"] is True
    assert body["verified"] is True
    assert body["mfa_verified"] is True
    assert len(body["recovery_codes"]) == 8

    check = client.get("/auth/check")
    assert check.status_code == 200
    check_body = check.json()
    assert check_body["authenticated"] is True
    assert check_body["mfa_enabled"] is True
    assert check_body["mfa_verified"] is True


def test_auth_me_after_mfa_enable(client):
    login = client.post(
        "/auth/login",
        json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD,
            "remember": False,
        },
    )
    assert login.status_code == 200

    setup = client.post("/auth/mfa/setup")
    secret = setup.json()["secret"]
    current_code = pyotp.TOTP(secret).now()

    enable = client.post("/auth/mfa/enable", json={"code": current_code})
    assert enable.status_code == 200

    response = client.get("/auth/me")
    assert response.status_code == 200
    body = response.json()
    assert body["ok"] is True
    assert body["user"]["id"] == TEST_USER_ID
    assert body["user"]["email"] == TEST_EMAIL
    assert body["user"]["mfa_enabled"] is True
    assert body["user"]["mfa_verified"] is True


def test_protected_assistant_route_loads_after_login_mfa_and_legal_acceptance(client):
    fake_state["accepted_legal"] = True

    login = client.post(
        "/auth/login",
        json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD,
            "remember": False,
        },
    )
    assert login.status_code == 200

    setup = client.post("/auth/mfa/setup")
    secret = setup.json()["secret"]
    current_code = pyotp.TOTP(secret).now()

    enable = client.post("/auth/mfa/enable", json={"code": current_code})
    assert enable.status_code == 200

    response = client.get("/assistant")
    assert response.status_code == 200
    assert "text/html" in response.headers.get("content-type", "").lower()


def test_logout_clears_session(client):
    login = client.post(
        "/auth/login",
        json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD,
            "remember": False,
        },
    )
    assert login.status_code == 200

    logout = client.post("/auth/logout")
    assert logout.status_code == 200
    assert logout.json()["ok"] is True

    check = client.get("/auth/check")
    assert check.status_code == 200
    assert check.json()["authenticated"] is False


def test_recovery_code_verification(client):
    login = client.post(
        "/auth/login",
        json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD,
            "remember": False,
        },
    )
    assert login.status_code == 200

    setup = client.post("/auth/mfa/setup")
    secret = setup.json()["secret"]
    current_code = pyotp.TOTP(secret).now()

    enable = client.post("/auth/mfa/enable", json={"code": current_code})
    assert enable.status_code == 200
    recovery_codes = enable.json()["recovery_codes"]
    assert recovery_codes

    # simulate a fresh post-login but pre-verified session
    fake_state["mfa_verified"] = False
    login2 = client.post(
        "/auth/login",
        json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD,
            "remember": False,
        },
    )
    assert login2.status_code == 200

    verify = client.post(
        "/auth/mfa/verify-recovery",
        json={"recovery_code": recovery_codes[0]},
    )
    assert verify.status_code == 200
    body = verify.json()
    assert body["ok"] is True
    assert body["verified"] is True
    assert body["mfa_verified"] is True
