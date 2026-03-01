response = JSONResponse({"message": "Logged in"})
response.set_cookie(
    key="access_token",
    value=token,
    httponly=True,
    secure=False,
    samesite="none",
    path="/"
)
return response
