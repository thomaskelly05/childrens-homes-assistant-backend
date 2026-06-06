from __future__ import annotations

from typing import Callable

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse, Response

from services.security_rate_limit_service import (
    check_request_rate_limit,
    log_rate_limit_event,
    rate_limit_exceeded_response,
)


class OrbRateLimitMiddleware(BaseHTTPMiddleware):
    """Uniform ORB and auth rate limiting — fails safely with 429, no sensitive content logged."""

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        rule = check_request_rate_limit(request)
        if rule:
            log_rate_limit_event(request, rule)
            exc = rate_limit_exceeded_response(rule)
            return JSONResponse(status_code=exc.status_code, content=exc.detail)
        return await call_next(request)
