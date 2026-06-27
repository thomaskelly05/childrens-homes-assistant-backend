from __future__ import annotations

import pyotp

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


def enable_mfa(client, fake_state):
    setup = client.get("/auth/mfa/setup")
    assert setup.status_code == 200
    secret = setup.json()["secret"]
    code = pyotp.TOTP(secret).now()
    enable = client.post("/auth/mfa/setup", json={"code": code})
    assert enable.status_code == 200
    fake_state["mfa_enabled"] = True
    return enable


def test_unauthenticated_get_assistant_remains_401(client):
    response = client.get("/assistant", follow_redirects=False)
    assert response.status_code in (302, 307, 401)
    if response.status_code in (302, 307):
        assert response.headers["location"] == "/login"


def test_admin_without_mfa_cannot_load_assistant_shell(client, fake_state):
    fake_state["accepted_legal"] = True
    login_user(client)

    response = client.get("/assistant", follow_redirects=False)
    assert response.status_code in (302, 307)
    assert response.headers["location"] == "/mfa-setup"


def test_admin_without_mfa_cannot_call_general_stream(client, fake_state):
    fake_state["accepted_legal"] = True
    login_user(client)

    response = client.post(
        "/assistant/general/stream",
        json={"message": "hello", "response_mode": "balanced", "history": []},
    )
    assert response.status_code == 403
    body = auth_error_body(response)
    assert body["code"] == "mfa_setup_required"


def test_staff_without_mfa_can_load_assistant_when_legal_accepted(client, fake_state):
    fake_state["user"]["role"] = "staff"
    fake_state["accepted_legal"] = True
    login_user(client)

    response = client.get("/assistant", follow_redirects=False)
    assert response.status_code == 200
    assert "text/html" in response.headers.get("content-type", "").lower()


def test_staff_without_mfa_can_call_general_stream_when_legal_accepted(client, fake_state):
    fake_state["user"]["role"] = "staff"
    fake_state["accepted_legal"] = True
    login_user(client)

    response = client.post(
        "/assistant/general/stream",
        json={
            "message": "hello",
            "response_mode": "balanced",
            "history": [],
        },
    )
    assert response.status_code == 200
    assert "text/event-stream" in response.headers.get("content-type", "").lower()


def test_staff_with_mfa_enabled_but_unverified_is_blocked(client, fake_state):
    fake_state["user"]["role"] = "staff"
    fake_state["accepted_legal"] = True
    fake_state["mfa_enabled"] = True
    login_user(client)

    response = client.get("/assistant", follow_redirects=False)
    assert response.status_code in (302, 307)
    assert response.headers["location"] == "/mfa"


def test_mfa_complete_without_legal_cannot_load_assistant_shell(client, fake_state):
    fake_state["accepted_legal"] = False
    login_user(client)
    enable_mfa(client, fake_state)

    response = client.get("/assistant", follow_redirects=False)
    assert response.status_code == 403
    assert "text/html" in response.headers.get("content-type", "").lower()
    assert "Legal acceptance required" in response.text


def test_mfa_complete_without_legal_cannot_call_general_stream(client, fake_state):
    fake_state["accepted_legal"] = False
    login_user(client)
    enable_mfa(client, fake_state)

    response = client.post(
        "/assistant/general/stream",
        json={"message": "hello", "response_mode": "balanced", "history": []},
    )
    assert response.status_code == 403
    body = auth_error_body(response)
    assert body["code"] == "legal_acceptance_required"


def test_mfa_complete_and_legal_accepted_can_load_assistant_shell(client, fake_state):
    fake_state["accepted_legal"] = True
    login_user(client)
    enable_mfa(client, fake_state)

    response = client.get("/assistant", follow_redirects=False)
    assert response.status_code == 200
    assert "text/html" in response.headers.get("content-type", "").lower()


def test_auth_me_remains_informational_without_mfa(client, fake_state):
    fake_state["accepted_legal"] = True
    login_user(client)

    response = client.get("/auth/me")
    assert response.status_code == 200
    body = response.json()
    assert body["ok"] is True
    assert body["user"]["mfa_verified"] is False


def test_orb_shell_not_subject_to_os_mfa_gate(client, fake_state):
    fake_state["accepted_legal"] = False
    login_user(client)

    response = client.get("/orb", follow_redirects=False)
    assert response.status_code == 200
    assert "text/html" in response.headers.get("content-type", "").lower()


def test_public_routes_still_work(client):
    assert client.get("/login").status_code == 200
    assert client.get("/mfa-setup").status_code == 200
    assert client.get("/health").status_code == 200
    assert client.get("/auth/check").status_code == 200
    assert client.get("/indicare-ai/assistant.css").status_code == 200
