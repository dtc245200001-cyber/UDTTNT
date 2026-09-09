import asyncio
import os
import sys

from fastapi.testclient import TestClient

sys.path.append(os.getcwd())
from main import app

client = TestClient(app)

print("--- Registering new user ---")
response = client.post(
    "/api/auth/register",
    json={
        "name": "Test Bug 4",
        "email": "testbug4@example.com",
        "password": "testbug123"
    }
)
print("STATUS CODE:", response.status_code)
print("RESPONSE:", response.json())

print("--- Registering duplicate user ---")
response_dup = client.post(
    "/api/auth/register",
    json={
        "name": "Test Bug 4",
        "email": "testbug4@example.com",
        "password": "testbug123"
    }
)
print("STATUS CODE:", response_dup.status_code)
print("RESPONSE:", response_dup.json())
