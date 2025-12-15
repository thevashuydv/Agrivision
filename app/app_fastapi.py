# app/app_fastapi.py
import os
import shutil
from fastapi import FastAPI, UploadFile, File, Request, Depends, HTTPException, status
from fastapi.responses import HTMLResponse, JSONResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from predict import predict  # uses your existing predict(image_path) -> dict
from predict import get_fertilizer_recommendation  # fertilizer recommendation function
from typing import Optional
from pydantic import BaseModel
from app.database import init_db
from app.community_api import router as community_router
from app.weather_api import router as weather_router
from app.auth import verify_clerk_session

app = FastAPI(title="AgriVision")

# Initialize database on startup
@app.on_event("startup")
async def startup_event():
    init_db()

# Include routers
app.include_router(community_router)
app.include_router(weather_router)

# static & templates
app.mount("/static", StaticFiles(directory="app/static"), name="static")
templates = Jinja2Templates(directory="app/templates")

# Clerk configuration
CLERK_PUBLISHABLE_KEY = os.getenv("CLERK_PUBLISHABLE_KEY", "")
CLERK_SECRET_KEY = os.getenv("CLERK_SECRET_KEY", "")
CLERK_FRONTEND_API = os.getenv("CLERK_FRONTEND_API", "")

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
