import requests

API_URL = "http://localhost:8000/assistant/stream"
TOKEN = "YOUR_JWT_TOKEN_HERE"

modes = ["reflective", "grounding", "debrief", "planning", "training"]

for mode in modes:
    print(f"\n--- TESTING MODE: {mode.upper()} ---\n")

    payload = {
        "message": "Can we check in?",
        "role": "Support Worker",
        "mode": mode,
        "ld_friendly": False,
        "slow_mode": False
    }

    r = requests.post(
        API_URL,
        json=payload,
        cookies={"access_token": TOKEN},
        stream=True
    )

    for chunk in r.iter_content(chunk_size=None):
        if chunk:
            print(chunk.decode("utf-8"), end="", flush=True)

    print("\n--- END MODE TEST ---\n")
