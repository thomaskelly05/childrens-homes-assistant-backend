# app/auth/pages.py
from fastapi.responses import HTMLResponse

def login_page():
    return HTMLResponse("""
    <html> ... your login HTML ... </html>
    """)
