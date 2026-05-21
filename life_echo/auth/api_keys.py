from __future__ import annotations

import hashlib
import hmac
import os
from datetime import datetime, timezone

DEFAULT_SECRET = "life-echo-dev-secret"


class LifeEchoApiKeyManager:
    """Minimal API signing helper for plugin integrations."""

    @staticmethod
    def get_secret() -> str:
        return os.getenv("LIFE_ECHO_API_SECRET", DEFAULT_SECRET)

    @classmethod
    def sign_payload(cls, payload: str) -> str:
        secret = cls.get_secret().encode("utf-8")
        return hmac.new(secret, payload.encode("utf-8"), hashlib.sha256).hexdigest()

    @classmethod
    def verify_signature(cls, payload: str, signature: str) -> bool:
        expected = cls.sign_payload(payload)
        return hmac.compare_digest(expected, signature)

    @staticmethod
    def build_provider_token(provider_name: str) -> dict:
        return {
            "provider": provider_name,
            "issued_at": datetime.now(timezone.utc).isoformat(),
        }
