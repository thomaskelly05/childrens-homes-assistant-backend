# app/auth/dependencies.py
from fastapi import Depends, HTTPException
from fastapi.responses import RedirectResponse

def get_current_user(...):
    # decode session cookie
    ...

def require_role(roles: list[str]):
    def wrapper(user = Depends(get_current_user)):
        if user.role not in roles:
            return RedirectResponse("/login")
        return user
    return wrapper
