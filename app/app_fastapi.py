# app/app_fastapi.py
import os
import shutil
from fastapi import FastAPI, UploadFile, File, Request, Depends, HTTPException, status
from fastapi.responses import HTMLResponse, JSONResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from predict import predict  # uses your existing predict(image_path) -> dict
from predict import get_fertilizer_recommendation  # fertilizer recommendation function
import httpx
from typing import Optional
from pydantic import BaseModel

app = FastAPI(title="AgriVision")

# static & templates
app.mount("/static", StaticFiles(directory="app/static"), name="static")
templates = Jinja2Templates(directory="app/templates")

# Clerk configuration
CLERK_PUBLISHABLE_KEY = os.getenv("CLERK_PUBLISHABLE_KEY", "")
CLERK_SECRET_KEY = os.getenv("CLERK_SECRET_KEY", "")
CLERK_FRONTEND_API = os.getenv("CLERK_FRONTEND_API", "")

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

@app.get("/", response_class=HTMLResponse)
async def index(request: Request):
    # If Clerk is configured, verify session (but don't block access if not configured)
    user = None
    if CLERK_SECRET_KEY:
        user = await verify_clerk_session(request)
        # If Clerk is required and user is not authenticated, redirect to login
        # For now, we'll allow access but show login button if not authenticated
    
    return templates.TemplateResponse("dashboard.html", {
        "request": request,
        "user": user,
        "clerk_publishable_key": CLERK_PUBLISHABLE_KEY,
        "clerk_frontend_api": CLERK_FRONTEND_API
    })

@app.get("/login", response_class=HTMLResponse)
async def login(request: Request):
    return templates.TemplateResponse("login.html", {
        "request": request,
        "clerk_publishable_key": CLERK_PUBLISHABLE_KEY,
        "clerk_frontend_api": CLERK_FRONTEND_API
    })

@app.post("/api/predict")
async def api_predict(file: UploadFile = File(...)):
    # save temp file
    tmp_path = "temp_upload.jpg"
    with open(tmp_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # run prediction (predict returns dict: class, confidence, description, treatment)
    try:
        result = predict(tmp_path)
    except Exception as e:
        # keep error simple and consistent for frontend
        return JSONResponse({"error": "prediction_failed", "message": str(e)}, status_code=500)
    finally:
        # optional: keep or remove temp file
        if os.path.exists(tmp_path):
            os.remove(tmp_path)

    return JSONResponse({"result": result})

# small route to return rendered fragment (optional)
@app.post("/render_result_fragment", response_class=HTMLResponse)
async def render_result_fragment(request: Request):
    data = await request.json()
    return templates.TemplateResponse("result_partial.html", {"request": request, "r": data})

# Fertilizer recommendation request model
class FertilizerRequest(BaseModel):
    temperature: float
    humidity: float
    moisture: float
    soilType: str
    cropType: str
    nitrogen: float
    phosphorous: float

@app.post("/api/fertilizer-recommendation")
async def api_fertilizer_recommendation(request: FertilizerRequest):
    """Get fertilizer recommendations from Gemini API based on user inputs"""
    try:
        recommendation = get_fertilizer_recommendation(
            temperature=request.temperature,
            humidity=request.humidity,
            moisture=request.moisture,
            soil_type=request.soilType,
            crop_type=request.cropType,
            nitrogen=request.nitrogen,
            phosphorous=request.phosphorous
        )
        
        if recommendation:
            return JSONResponse({"recommendation": recommendation})
        else:
            return JSONResponse(
                {"error": "recommendation_failed", "message": "Failed to get fertilizer recommendation"},
                status_code=500
            )
    except Exception as e:
        return JSONResponse(
            {"error": "recommendation_failed", "message": str(e)},
            status_code=500
        )
