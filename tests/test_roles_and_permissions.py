import pyotp

from tests.conftest import TEST_EMAIL, TEST_PASSWORD


def login_user(client, email=TEST_EMAIL, password=TEST_PASSWORD):
    response = client.post(
        "/auth/login",
        json={
            "email": email,
            "password": password,
            "remember": False,
        },
    )
    assert response.status_code == 200
    return response


def enable_mfa(client):
    setup = client.post("/auth/mfa/setup")
    assert setup.status_code == 200

    secret = setup.json()["secret"]
    code = pyotp.TOTP(secret).now()

    enable = client.post("/auth/mfa/enable", json={"code": code})
    assert enable.status_code == 200
    return enable


def set_role(fake_state, role):
    fake_state["user"]["role"] = role


def fully_authenticate(client, fake_state, role="admin", accepted_legal=True):
    set_role(fake_state, role)
    fake_state["accepted_legal"] = accepted_legal
    login_user(client)
    enable_mfa(client)


def test_admin_can_access_assistant(client, fake_state):
    fully_authenticate(client, fake_state, role="admin", accepted_legal=True)

    response = client.get("/assistant")
    assert response.status_code == 200
    assert "text/html" in response.headers.get("content-type", "").lower()


def test_manager_can_access_assistant(client, fake_state):
    fully_authenticate(client, fake_state, role="manager", accepted_legal=True)

    response = client.get("/assistant")
    assert response.status_code == 200
    assert "text/html" in response.headers.get("content-type", "").lower()


def test_staff_can_access_assistant(client, fake_state):
    fully_authenticate(client, fake_state, role="staff", accepted_legal=True)

    response = client.get("/assistant")
    assert response.status_code == 200
    assert "text/html" in response.headers.get("content-type", "").lower()


def test_auth_me_returns_admin_role(client, fake_state):
    fully_authenticate(client, fake_state, role="admin", accepted_legal=True)

    response = client.get("/auth/me")
    assert response.status_code == 200
    body = response.json()
    assert body["ok"] is True
    assert body["user"]["role"] == "admin"


def test_auth_me_returns_manager_role(client, fake_state):
    fully_authenticate(client, fake_state, role="manager", accepted_legal=True)

    response = client.get("/auth/me")
    assert response.status_code == 200
    body = response.json()
    assert body["ok"] is True
    assert body["user"]["role"] == "manager"


def test_auth_me_returns_staff_role(client, fake_state):
    fully_authenticate(client, fake_state, role="staff", accepted_legal=True)

    response = client.get("/auth/me")
    assert response.status_code == 200
    body = response.json()
    assert body["ok"] is True
    assert body["user"]["role"] == "support_worker"


def test_admin_subscription_inactive_still_allows_auth_check(client, fake_state):
    set_role(fake_state, "admin")
    fake_state["billing"]["subscription_active"] = False
    fake_state["billing"]["subscription_status"] = "inactive"
    fake_state["billing"]["plan_name"] = None

    login_user(client)

    response = client.get("/auth/check")
    assert response.status_code == 200
    body = response.json()
    assert body["authenticated"] is True
    assert body["role"] == "admin"
    assert body["subscription_active"] is False


def test_provider_admin_subscription_inactive_still_allows_auth_check(client, fake_state):
    set_role(fake_state, "provider_admin")
    fake_state["billing"]["subscription_active"] = False
    fake_state["billing"]["subscription_status"] = "inactive"
    fake_state["billing"]["plan_name"] = None

    login_user(client)

    response = client.get("/auth/check")
    assert response.status_code == 200
    body = response.json()
    assert body["authenticated"] is True
    assert body["role"] == "provider_admin"
    assert body["subscription_active"] is False


def test_manager_subscription_state_exposed_in_auth_check(client, fake_state):
    set_role(fake_state, "manager")
    fake_state["billing"]["subscription_active"] = True
    fake_state["billing"]["subscription_status"] = "active"
    fake_state["billing"]["plan_name"] = "Pro"

    login_user(client)

    response = client.get("/auth/check")
    assert response.status_code == 200
    body = response.json()
    assert body["authenticated"] is True
    assert body["role"] == "manager"
    assert body["subscription_active"] is True
    assert body["subscription_status"] == "active"
    assert body["plan_name"] == "Pro"


def test_staff_subscription_state_exposed_in_auth_check(client, fake_state):
    set_role(fake_state, "staff")
    fake_state["billing"]["subscription_active"] = True
    fake_state["billing"]["subscription_status"] = "active"
    fake_state["billing"]["plan_name"] = "Pro"

    login_user(client)

    response = client.get("/auth/check")
    assert response.status_code == 200
    body = response.json()
    assert body["authenticated"] is True
    assert body["role"] == "support_worker"
    assert body["subscription_active"] is True
    assert body["subscription_status"] == "active"
    assert body["plan_name"] == "Pro"


def test_archived_user_cannot_login(client, fake_state):
    fake_state["user"]["archived"] = True

    response = client.post(
        "/auth/login",
        json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD,
            "remember": False,
        },
    )
    assert response.status_code == 403
    assert "archived" in response.text.lower()

    fake_state["user"]["archived"] = False


def test_inactive_user_cannot_login(client, fake_state):
    fake_state["user"]["is_active"] = False

    response = client.post(
        "/auth/login",
        json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD,
            "remember": False,
        },
    )
    assert response.status_code == 403
    assert "inactive" in response.text.lower()

    fake_state["user"]["is_active"] = True


def test_role_survives_login_mfa_and_auth_me(client, fake_state):
    set_role(fake_state, "manager")
    fake_state["accepted_legal"] = True

    login_user(client)
    enable_mfa(client)

    response = client.get("/auth/me")
    assert response.status_code == 200
    body = response.json()
    assert body["user"]["role"] == "manager"


def test_home_id_survives_login_mfa_and_auth_me(client, fake_state):
    fake_state["user"]["home_id"] = 42
    fake_state["accepted_legal"] = True

    login_user(client)
    enable_mfa(client)

    response = client.get("/auth/me")
    assert response.status_code == 200
    body = response.json()
    assert body["user"]["home_id"] == 42

    fake_state["user"]["home_id"] = 1
