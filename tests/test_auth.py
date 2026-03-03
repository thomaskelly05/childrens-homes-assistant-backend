import requests

API_URL = "http://localhost:8000/assistant/stream"

def test_missing_token():
    r = requests.post(API_URL, json={"message": "hello"})
    print("Status:", r.status_code)
    print("Response:", r.text)

def test_invalid_token():
    r = requests.post(
        API_URL,
        json={"message": "hello"},
        cookies={"access_token": "INVALID"}
    )
    print("Status:", r.status_code)
    print("Response:", r.text)

def test_valid_token():
    r = requests.post(
        API_URL,
        json={"message": "hello"},
        cookies={"access_token": "YOUR_JWT_TOKEN_HERE"}
    )
    print("Status:", r.status_code)
    print("Response:", r.text)
