from __future__ import annotations

import hashlib
import hmac
import json

import requests


class LifeEchoClient:
    """Simple SDK client for external providers integrating with LifeEcho."""

    def __init__(self, *, base_url: str, api_secret: str) -> None:
        self.base_url = base_url.rstrip("/")
        self.api_secret = api_secret

    def _sign(self, payload: str) -> str:
        return hmac.new(
            self.api_secret.encode("utf-8"),
            payload.encode("utf-8"),
            hashlib.sha256,
        ).hexdigest()

    def send_event(self, event: dict) -> dict:
        payload = json.dumps(event)
        signature = self._sign(payload)

        response = requests.post(
            f"{self.base_url}/api/life-echo/webhooks/ingest",
            data=payload,
            headers={
                "Content-Type": "application/json",
                "X-Life-Echo-Signature": signature,
            },
            timeout=30,
        )

        response.raise_for_status()
        return response.json()
