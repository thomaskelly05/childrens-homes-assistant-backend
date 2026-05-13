from __future__ import annotations

import bcrypt


DUMMY_BCRYPT_HASH = b"$2b$12$yAc2mW0pYv4B4xXj3H3oJ.5XQmsx3M3uVJfY0jQnR8iW0VtT1hN3K"


def ensure_password_hash_bytes(password_hash: str | bytes | None) -> bytes:
    if password_hash is None:
        return b""
    return password_hash if isinstance(password_hash, bytes) else password_hash.encode("utf-8")


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, password_hash: str | bytes | None) -> bool:
    try:
        return bool(password_hash) and bcrypt.checkpw(
            password.encode("utf-8"),
            ensure_password_hash_bytes(password_hash),
        )
    except ValueError:
        return False


def burn_dummy_password_check(password: str) -> None:
    try:
        bcrypt.checkpw(password.encode("utf-8"), DUMMY_BCRYPT_HASH)
    except Exception:
        pass
