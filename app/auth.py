# app/auth.py
import os
import httpx
from fastapi import Request
from typing import Optional

# Clerk configuration
CLERK_SECRET_KEY = os.getenv("CLERK_SECRET_KEY", "")

async def verify_clerk_session(request: Request):
    """Verify Clerk session from request"""
    if not CLERK_SECRET_KEY:
        return None  # Clerk not configured, allow access
    
    # Get session token from cookies or Authorization header
    session_token = request.cookies.get("__session") or request.headers.get("Authorization", "").replace("Bearer ", "")
    
    if not session_token:
        return None
    
    try:
        async with httpx.AsyncClient() as client:
            # Verify session with Clerk API
            response = await client.get(
                f"https://api.clerk.com/v1/sessions/{session_token}/verify",
                headers={
                    "Authorization": f"Bearer {CLERK_SECRET_KEY}",
                    "Content-Type": "application/json"
                }
            )
            if response.status_code == 200:
                session_data = response.json()
                # Get user info
                user_id = session_data.get("user_id")
                if user_id:
                    user_response = await client.get(
                        f"https://api.clerk.com/v1/users/{user_id}",
                        headers={
                            "Authorization": f"Bearer {CLERK_SECRET_KEY}",
                            "Content-Type": "application/json"
                        }
                    )
                    if user_response.status_code == 200:
                        return user_response.json()
    except Exception as e:
        print(f"Clerk verification error: {e}")
    
    return None

