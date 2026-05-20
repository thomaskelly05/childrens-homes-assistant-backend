from tests.conftest import TEST_EMAIL, TEST_PASSWORD


def auth_error_body(response):
    body = response.json()
    return body.get("detail", body)


def login_user(client):
    response = client.post(
        "/auth/login",
        json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD,
            "remember": False,
        },
    )
    assert response.status_code == 200
    return response


def enable_mfa(client):
    setup = client.get("/auth/mfa/setup")
    assert setup.status_code == 200

    import pyotp

    secret = setup.json()["secret"]
    code = pyotp.TOTP(secret).now()

    enable = client.post("/auth/mfa/setup", json={"code": code})
    assert enable.status_code == 200
    return enable


def test_assistant_redirects_to_login_when_not_authenticated(client):
    response = client.get("/assistant", follow_redirects=False)
    assert response.status_code in (302, 307, 401)
    if response.status_code in (302, 307):
        assert response.headers["location"] == "/login"


def test_auth_me_returns_401_when_not_authenticated(client):
    response = client.get("/auth/me")
    assert response.status_code == 401
    body = auth_error_body(response)
    assert body["code"] in {"authentication_required", "not_authenticated"}


def test_assistant_redirects_to_mfa_setup_when_logged_in_without_mfa(client, fake_state):
    fake_state["accepted_legal"] = True

    login_user(client)

    response = client.get("/assistant", follow_redirects=False)
    assert response.status_code in (302, 307, 401)
    if response.status_code in (302, 307):
        assert response.headers["location"] == "/mfa-setup"


def test_api_route_returns_mfa_setup_required_when_logged_in_without_mfa(client, fake_state):
    fake_state["accepted_legal"] = True

    login_user(client)

    response = client.get("/auth/me")
    assert response.status_code in (200, 403)
    body = auth_error_body(response)
    if response.status_code == 403:
        assert body["code"] == "mfa_setup_required"
    else:
        assert body["ok"] is True
        assert body["user"]["mfa_verified"] is False


def test_assistant_redirects_to_assistant_when_legal_not_accepted(client):
    login_user(client)
    enable_mfa(client)

    response = client.get("/assistant", follow_redirects=False)
    assert response.status_code in (302, 307, 401)
    if response.status_code in (302, 307):
        assert response.headers["location"] == "/assistant"


def test_api_route_returns_legal_acceptance_required_when_legal_not_accepted(client):
    login_user(client)
    enable_mfa(client)

    response = client.get("/auth/me")
    assert response.status_code in (200, 403)
    body = auth_error_body(response)
    if response.status_code == 403:
        assert body["code"] == "legal_acceptance_required"
    else:
        assert body["ok"] is True
        assert body["user"]["mfa_verified"] is True


def test_assistant_loads_when_authenticated_mfa_verified_and_legal_accepted(client, fake_state):
    fake_state["accepted_legal"] = True

    login_user(client)
    enable_mfa(client)

    response = client.get("/assistant")
    assert response.status_code in (200, 401)
    if response.status_code == 200:
        assert "text/html" in response.headers.get("content-type", "").lower()


def test_auth_me_loads_when_authenticated_mfa_verified_and_legal_accepted(client, fake_state):
    fake_state["accepted_legal"] = True

    login_user(client)
    enable_mfa(client)

    response = client.get("/auth/me")
    assert response.status_code == 200
    body = response.json()
    assert body["ok"] is True
    assert body["user"]["mfa_enabled"] is True
    assert body["user"]["mfa_verified"] is True


def test_public_routes_still_work_without_auth(client):
    login_page = client.get("/login")
    assert login_page.status_code == 200

    auth_check = client.get("/auth/check")
    assert auth_check.status_code == 200
    assert auth_check.json()["authenticated"] is False

    health = client.get("/health")
    assert health.status_code == 200
    assert health.json()["ok"] is True


def test_logout_route_is_allowed_even_when_not_authenticated(client):
    response = client.post("/auth/logout")
    assert response.status_code == 200
    body = response.json()
    assert body["ok"] is True


def test_mfa_status_requires_login(client):
    response = client.get("/auth/mfa/status")
    assert response.status_code == 401


def test_mfa_status_works_after_login(client):
    login_user(client)

    response = client.get("/auth/mfa/status")
    assert response.status_code == 200
    body = response.json()
    assert body["ok"] is True
    assert body["mfa_enabled"] is False
    assert body["mfa_verified"] is False
