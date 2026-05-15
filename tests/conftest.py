import os

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
import auth.passwords as password_module  # noqa: E402
import auth.legal_acceptance as legal_acceptance_module  # noqa: E402
import core.lifespan as lifespan_module  # noqa: E402
import db.legal_acceptance_db as legal_acceptance_db  # noqa: E402
from middleware.security_middleware import CsrfProtectionMiddleware  # noqa: E402

TEST_USER_ID = 5
TEST_EMAIL = "admin1@indicare.co.uk"
TEST_PASSWORD = "Password123!"
TEST_ROLE = "admin"
TEST_HOME_ID = 1


@pytest.fixture()
def fake_state():
    return {
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
        "totp_secret": pyotp.random_base32(),
        "recovery_codes": [],
        "accepted_legal": False,
    }


@pytest.fixture()
def client(monkeypatch, fake_state):
    async def _bypass_csrf_dispatch(self, request, call_next):
        return await call_next(request)

    monkeypatch.setattr(CsrfProtectionMiddleware, "dispatch", _bypass_csrf_dispatch)

    # -----------------------------
    # App startup / shutdown mocks
    # -----------------------------
    monkeypatch.setattr(app_module, "init_db_pool", lambda: None, raising=False)
    monkeypatch.setattr(app_module, "close_db_pool", lambda: None, raising=False)
    monkeypatch.setattr(app_module, "init_legal_acceptance_table", lambda: None, raising=False)
    monkeypatch.setattr(app_module, "init_mfa_tables", lambda: None, raising=False)
    monkeypatch.setattr(app_module, "init_passkeys_table", lambda: None, raising=False)
    monkeypatch.setattr(lifespan_module, "init_db_pool", lambda: None)
    monkeypatch.setattr(lifespan_module, "close_db_pool", lambda: None)
    monkeypatch.setattr(lifespan_module, "init_legal_acceptance_table", lambda: None)
    monkeypatch.setattr(lifespan_module, "init_mfa_tables", lambda: None)
    monkeypatch.setattr(lifespan_module, "init_passkeys_table", lambda: None)
    monkeypatch.setattr(lifespan_module, "init_partner_assistant_tables", lambda: None)
    monkeypatch.setattr(lifespan_module, "run_startup_migrations", lambda: None)

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

    monkeypatch.setattr(app_module, "get_db_connection", lambda: DummyConn(), raising=False)
    monkeypatch.setattr(app_module, "release_db_connection", lambda conn: None, raising=False)

    # -----------------------------
    # Token / auth helpers
    # -----------------------------
    monkeypatch.setattr(
        auth_routes,
        "create_session_token",
        lambda user_id, **_kwargs: f"test-token-{user_id}",
    )
    monkeypatch.setattr(
        mfa_routes,
        "create_session_token",
        lambda user_id, **_kwargs: f"test-token-{user_id}",
    )

    def fake_decode_session_token(token):
        if token == f"test-token-{TEST_USER_ID}":
            return {"sub": str(TEST_USER_ID)}
        return None

    monkeypatch.setattr(auth_routes, "decode_session_token", fake_decode_session_token)
    monkeypatch.setattr(app_module, "decode_session_token", fake_decode_session_token, raising=False)
    monkeypatch.setattr(current_user_module, "decode_session_token", fake_decode_session_token)
    monkeypatch.setattr(mfa_routes, "decode_session_token", fake_decode_session_token)

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

            if "from users where lower(email)" in q or "from users u" in q and "lower(u.email)" in q:
                email = params[0]
                self._result = fake_state["user"] if email == TEST_EMAIL.lower() else None
                return

            if (
                "from users where id = %s" in q
                or "from users where id =" in q
                or "from users u" in q and "where u.id = %s" in q
            ):
                user_id = params[0]
                self._result = fake_state["user"] if int(user_id) == TEST_USER_ID else None
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
        password_module,
        "verify_password",
        lambda password, password_hash: password == TEST_PASSWORD,
    )
    monkeypatch.setattr(
        auth_routes,
        "verify_password",
        lambda password, password_hash: password == TEST_PASSWORD,
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
    # MFA mocks
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

    def fake_enable_user_mfa(user_id, secret=None):
        if secret:
            fake_state["totp_secret"] = secret
        fake_state["mfa_enabled"] = True

    def fake_update_last_verified(user_id):
        fake_state["mfa_verified"] = True

    def fake_save_recovery_codes(user_id, recovery_codes):
        fake_state["recovery_codes"] = list(recovery_codes)
        return list(recovery_codes)

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
    monkeypatch.setattr(app_module, "user_has_enabled_mfa", lambda user_id: fake_state["mfa_enabled"], raising=False)

    monkeypatch.setattr(mfa_routes, "get_user_mfa", fake_get_user_mfa)
    monkeypatch.setattr(mfa_routes, "upsert_user_mfa_secret", fake_upsert_user_mfa_secret)
    monkeypatch.setattr(mfa_routes, "enable_user_mfa", fake_enable_user_mfa)
    monkeypatch.setattr(mfa_routes, "update_last_verified", fake_update_last_verified)
    monkeypatch.setattr(mfa_routes, "save_recovery_codes", fake_save_recovery_codes)
    monkeypatch.setattr(mfa_routes, "generate_and_store_recovery_codes", fake_generate_and_store_recovery_codes)
    monkeypatch.setattr(mfa_routes, "count_unused_recovery_codes", fake_count_unused_recovery_codes)
    monkeypatch.setattr(mfa_routes, "use_recovery_code", fake_use_recovery_code)
    monkeypatch.setattr(mfa_routes, "log_auth_event", lambda **kwargs: None)
    monkeypatch.setattr(mfa_routes, "user_has_passkeys", lambda user_id: False)

    monkeypatch.setattr(auth_routes, "log_auth_event", lambda **kwargs: None)
    monkeypatch.setattr(auth_routes, "user_has_passkeys", lambda user_id: False)

    # -----------------------------
    # Legal acceptance mocks
    # -----------------------------
    def fake_has_user_accepted_version(user_id, version):
        return fake_state["accepted_legal"]

    monkeypatch.setattr(app_module, "has_user_accepted_version", fake_has_user_accepted_version, raising=False)
    monkeypatch.setattr(legal_acceptance_module, "has_user_accepted_version", fake_has_user_accepted_version)
    monkeypatch.setattr(legal_acceptance_db, "has_user_accepted_version", fake_has_user_accepted_version)

    with TestClient(app_module.app) as test_client:
        yield test_client

    app_module.app.dependency_overrides.clear()
