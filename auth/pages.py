from fastapi.responses import HTMLResponse

def login_page():
    return HTMLResponse("""
    <html>
      <head>
        <title>IndiCare Login</title>
        <style>
          body { font-family: sans-serif; background:#f5f7fa; display:flex; justify-content:center; padding-top:80px; }
          .box { background:white; padding:32px; border-radius:12px; width:320px; box-shadow:0 4px 12px rgba(0,0,0,0.08); }
          h2 { color:#6CAEE0; margin-bottom:24px; }
          input { width:100%; padding:10px; margin-bottom:12px; border-radius:6px; border:1px solid #d0d7de; }
          button { width:100%; padding:10px; background:#6CAEE0; border:none; color:white; border-radius:6px; cursor:pointer; }
        </style>
      </head>
      <body>
        <div class="box">
          <h2>IndiCare Login</h2>
          <form method="POST" action="/login">
            <input name="email" placeholder="Email" />
            <input name="password" type="password" placeholder="Password" />
            <button type="submit">Login</button>
          </form>
        </div>
      </body>
    </html>
    """)
