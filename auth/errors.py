from __future__ import annotations

from typing import Any

from fastapi import HTTPException, status


def auth_error_detail(code: str, message: str, **extra: Any) -> dict[str, Any]:
    return {
        "code": code,
        "message": message,
        **{key: value for key, value in extra.items() if value is not None},
    }


def unauthorised(code: str, message: str, **extra: Any) -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail=auth_error_detail(code, message, **extra),
    )


def forbidden(code: str, message: str, **extra: Any) -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail=auth_error_detail(code, message, **extra),
    )


def service_unavailable(code: str, message: str, **extra: Any) -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        detail=auth_error_detail(code, message, **extra),
    )
