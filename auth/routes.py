@router.post("/login")
def login_post(
    response: Response,
    email: str = Form(...),
    password: str = Form(...),
    conn=Depends(get_db)
):
    print("DEBUG: login_post called with", email)

    with conn.cursor() as cur:
        print("DEBUG: DB cursor opened")
        cur.execute("SELECT id, email, password_hash, role FROM users WHERE email=%s", (email,))
        user = cur.fetchone()
        print("DEBUG: DB query result:", user)

    if not user:
        print("DEBUG: user not found")
        return JSONResponse({"success": False}, status_code=401)

    token = create_session_token(user["id"])
    role = user["role"]

    print("DEBUG: token created, role =", role)

    response.set_cookie(
        "session",
        token,
        httponly=True,
        secure=True,
        samesite="None",
        max_age=60*60*24*7
    )

    print("DEBUG: cookie set successfully")

    return JSONResponse({"success": True, "role": role})
