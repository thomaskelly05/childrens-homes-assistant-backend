import requests

API_URL = "http://localhost:8000/assistant/stream"

# Replace this with a real JWT token from your login flow
ACCESS_TOKEN = "YOUR_JWT_TOKEN_HERE"

payload = {
    "message": "I'm feeling a bit overwhelmed after my shift. Can we do a reflective check-in?",
    "role": "Support Worker",
    "mode": "reflective",
    "ld_friendly": False,
    "slow_mode": False
}

headers = {
    "Content-Type": "application/json",
}

cookies = {
    "access_token": ACCESS_TOKEN
}

with requests.post(API_URL, json=payload, headers=headers, cookies=cookies, stream=True) as r:
    if r.status_code != 200:
        print("Error:", r.status_code, r.text)
        exit()

    print("\n--- STREAMING RESPONSE ---\n")

    for chunk in r.iter_content(chunk_size=None):
        if chunk:
            print(chunk.decode("utf-8"), end="", flush=True)

    print("\n\n--- END OF STREAM ---\n")
