from __future__ import annotations

import os
import time
from dataclasses import dataclass, field

from fastapi import HTTPException, Request, status


@dataclass
class InMemoryRateLimiter:
    max_attempts: int
    window_seconds: int
    lockout_seconds: int
    attempts: dict[str, list[float]] = field(default_factory=dict)
    locked_until: dict[str, float] = field(default_factory=dict)

    def assert_allowed(self, key: str) -> None:
        now = time.time()
        until = self.locked_until.get(key)
        if until and until > now:
            raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail="Too many attempts. Please try again later.")
        if until:
            self.locked_until.pop(key, None)
        self.attempts[key] = [ts for ts in self.attempts.get(key, []) if now - ts <= self.window_seconds]

    def register_failure(self, key: str) -> None:
        now = time.time()
        values = [ts for ts in self.attempts.get(key, []) if now - ts <= self.window_seconds]
        values.append(now)
        self.attempts[key] = values
        if len(values) >= self.max_attempts:
            self.locked_until[key] = now + self.lockout_seconds

    def clear(self, key: str) -> None:
        self.attempts.pop(key, None)
        self.locked_until.pop(key, None)


def client_rate_limit_key(request: Request, *, suffix: str = "") -> str:
    forwarded = request.headers.get("x-forwarded-for", "")
    ip = forwarded.split(",")[0].strip() if forwarded else (request.client.host if request.client else "unknown")
    return f"{ip}:{suffix}" if suffix else ip


login_rate_limiter = InMemoryRateLimiter(
    max_attempts=int(os.getenv("AUTH_MAX_FAILED_ATTEMPTS_PER_IP", "20")),
    window_seconds=int(os.getenv("AUTH_THROTTLE_WINDOW_SECONDS", "900")),
    lockout_seconds=int(os.getenv("AUTH_LOCKOUT_SECONDS", "900")),
)
