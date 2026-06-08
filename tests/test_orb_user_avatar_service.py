from __future__ import annotations

from unittest.mock import MagicMock

from auth.models import staff_user_payload
from services.orb_oauth_service import normalise_profile
from services.orb_user_avatar_service import (
    get_user_display_profile,
    validate_avatar_url,
)


def test_validate_avatar_url_accepts_google_https():
    url = "https://lh3.googleusercontent.com/a/example"
    assert validate_avatar_url(url) == url


def test_validate_avatar_url_rejects_http_and_tokens():
    assert validate_avatar_url("http://lh3.googleusercontent.com/a/example") is None
    assert validate_avatar_url("https://evil.example/avatar.png") is None
    assert validate_avatar_url("https://lh3.googleusercontent.com/a/x?access_token=secret") is None


def test_normalise_profile_includes_safe_google_avatar():
    profile = normalise_profile(
        "google",
        {
            "sub": "abc",
            "email": "user@example.com",
            "email_verified": True,
            "picture": "https://lh3.googleusercontent.com/a/photo",
        },
    )
    assert profile["avatar_url"] == "https://lh3.googleusercontent.com/a/photo"
    assert "access_token" not in profile


def test_staff_user_payload_includes_avatar_without_tokens():
    user = {"id": 1, "email": "orb@test.com", "role": "orb_residential", "is_active": True, "archived": False}
    payload = staff_user_payload(
        user,
        avatar_url="https://lh3.googleusercontent.com/a/photo",
        auth_provider="google",
    )
    assert payload["avatar_url"] == "https://lh3.googleusercontent.com/a/photo"
    assert payload["auth_provider"] == "google"
    assert "access_token" not in payload


def test_get_user_display_profile_reads_oauth_metadata():
    conn = MagicMock()
    cursor = MagicMock()
    conn.cursor.return_value.__enter__.return_value = cursor
    cursor.fetchall.return_value = [
        {
            "provider": "google",
            "metadata": {"provider": "google", "avatar_url": "https://lh3.googleusercontent.com/a/photo"},
        }
    ]
    profile = get_user_display_profile(conn, 42)
    assert profile["avatar_url"] == "https://lh3.googleusercontent.com/a/photo"
    assert profile["auth_provider"] == "google"
