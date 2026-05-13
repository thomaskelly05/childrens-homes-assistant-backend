import pyotp

from tests.conftest import TEST_EMAIL, TEST_PASSWORD, TEST_ROLE, TEST_USER_ID


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
    assert response.status_code == 401
    assert "not authenticated" in response.text.lower()


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
    assert body["authenticated"] is False
    assert body["mfa_pending"] is True
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

    setup = client.get("/auth/mfa/setup")
    assert setup.status_code == 200

    body = setup.json()
    assert body["ok"] is True
    assert body["secret"]
    assert body["provisioning_uri"].startswith("otpauth://")
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

    setup = client.get("/auth/mfa/setup")
    secret = setup.json()["secret"]
    current_code = pyotp.TOTP(secret).now()

    enable = client.post("/auth/mfa/setup", json={"code": current_code})
    assert enable.status_code == 200

    body = enable.json()
    assert body["ok"] is True
    assert body["mfa_enabled"] is True
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

    setup = client.get("/auth/mfa/setup")
    secret = setup.json()["secret"]
    current_code = pyotp.TOTP(secret).now()

    enable = client.post("/auth/mfa/setup", json={"code": current_code})
    assert enable.status_code == 200

    response = client.get("/auth/me")
    assert response.status_code == 200
    body = response.json()
    assert body["ok"] is True
    assert body["user"]["id"] == TEST_USER_ID
    assert body["user"]["email"] == TEST_EMAIL
    assert body["user"]["mfa_enabled"] is True
    assert body["user"]["mfa_verified"] is True


def test_protected_assistant_route_loads_after_login_mfa_and_legal_acceptance(client, fake_state):
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

    setup = client.get("/auth/mfa/setup")
    secret = setup.json()["secret"]
    current_code = pyotp.TOTP(secret).now()

    enable = client.post("/auth/mfa/setup", json={"code": current_code})
    assert enable.status_code == 200

    response = client.get("/auth/me")
    assert response.status_code == 200
    assert response.json()["user"]["permissions"]


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


def test_recovery_code_verification(client, fake_state):
    login = client.post(
        "/auth/login",
        json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD,
            "remember": False,
        },
    )
    assert login.status_code == 200

    setup = client.get("/auth/mfa/setup")
    secret = setup.json()["secret"]
    current_code = pyotp.TOTP(secret).now()

    enable = client.post("/auth/mfa/setup", json={"code": current_code})
    assert enable.status_code == 200
    recovery_codes = enable.json()["recovery_codes"]
    assert recovery_codes

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

    verify = client.post("/auth/mfa/recovery", json={"code": recovery_codes[0]})
    assert verify.status_code == 200
    body = verify.json()
    assert body["ok"] is True
    assert body["mfa_verified"] is True
