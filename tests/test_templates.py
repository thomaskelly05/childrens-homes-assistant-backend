import requests

API_URL = "http://localhost:8000/assistant/stream"
TOKEN = "YOUR_JWT_TOKEN_HERE"

payload = {
    "message": "Can you generate a risk assessment template?",
    "role": "Support Worker",
    "mode": "planning",
    "ld_friendly": False,
    "slow_mode": False
}

r = requests.post(
    API_URL,
    json=payload,
    cookies={"access_token": TOKEN},
    stream=True
)

print("\n--- TEMPLATE GENERATION STREAM ---\n")
for chunk in r.iter_content(chunk_size=None):
    if chunk:
        print(chunk.decode("utf-8"), end="", flush=True)
print("\n\n--- END ---\n")
