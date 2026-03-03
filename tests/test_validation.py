import requests

API_URL = "http://localhost:8000/assistant/stream"
TOKEN = "YOUR_JWT_TOKEN_HERE"

def send(msg):
    return requests.post(
        API_URL,
        json={"message": msg},
        cookies={"access_token": TOKEN}
    )

tests = [
    "J. was upset earlier",  # initials
    "John Smith was shouting",  # full name
    "in the incident earlier",  # casework
    "what should I do when they refuse",  # behaviour advice
]

for t in tests:
    r = send(t)
    print("\nTEST:", t)
    print("Status:", r.status_code)
    print("Response:", r.text)
