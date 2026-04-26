# backend/app_fastapi.py
import os
import shutil
from pathlib import Path

# Load repo-root .env for every entrypoint (uvicorn, tests, gunicorn)
try:
    from dotenv import load_dotenv

    _env = Path(__file__).resolve().parent.parent / ".env"
    load_dotenv(_env)
except ImportError:
    pass
from fastapi import FastAPI, UploadFile, File
from fastapi.responses import JSONResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from .predict import predict, get_fertilizer_recommendation
from .database import init_db
from .community_api import router as community_router
from .weather_api import router as weather_router
from .market_api import router as market_router
from .advisory_chat_api import router as advisory_chat_router

app = FastAPI(title="AgriVision")

# Comma-separated URLs, e.g. https://app.vercel.app,https://www.example.com
# If unset, local Vite dev origins only.
_cors_env = (os.getenv("CORS_ALLOW_ORIGINS") or "").strip()
if _cors_env:
    _cors_origins = [o.strip() for o in _cors_env.split(",") if o.strip()]
else:
    _cors_origins = [
        "http://127.0.0.1:5173",
        "http://localhost:5173",
    ]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# backend/ directory (this file lives here)
BACKEND_DIR = Path(__file__).resolve().parent
# repository root (parent of backend/)
REPO_ROOT = BACKEND_DIR.parent
_REACT_DIST = REPO_ROOT / "frontend" / "dist"


@app.on_event("startup")
async def startup_event():
    init_db()


@app.get("/", include_in_schema=False)
async def root():
    if _REACT_DIST.is_dir() and (_REACT_DIST / "index.html").is_file():
        return RedirectResponse(url="/react/", status_code=302)
    return JSONResponse({"service": "AgriVision", "docs": "/docs"})


app.include_router(community_router)
app.include_router(weather_router)
app.include_router(market_router)
app.include_router(advisory_chat_router)


@app.post("/api/predict")
async def api_predict(file: UploadFile = File(...)):
    tmp_path = BACKEND_DIR / "temp_upload.jpg"
    with open(tmp_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    try:
        result = predict(str(tmp_path))
    except Exception as e:
        return JSONResponse({"error": "prediction_failed", "message": str(e)}, status_code=500)
    finally:
        if tmp_path.exists():
            tmp_path.unlink(missing_ok=True)

    return JSONResponse({"result": result})


class FertilizerRequest(BaseModel):
    temperature: float
    humidity: float
    moisture: float
    soilType: str
    cropType: str
    nitrogen: float
    phosphorous: float
    potassium: float


@app.post("/api/fertilizer-recommendation")
async def api_fertilizer_recommendation(request: FertilizerRequest):
    try:
        recommendation = get_fertilizer_recommendation(
            temperature=request.temperature,
            humidity=request.humidity,
            moisture=request.moisture,
            soil_type=request.soilType,
            crop_type=request.cropType,
            nitrogen=request.nitrogen,
            phosphorous=request.phosphorous,
            potassium=request.potassium,
        )
        if recommendation:
            return JSONResponse({"recommendation": recommendation})
        return JSONResponse(
            {"error": "recommendation_failed", "message": "Failed to get fertilizer recommendation"},
            status_code=500,
        )
    except Exception as e:
        return JSONResponse(
            {"error": "recommendation_failed", "message": str(e)},
            status_code=500,
        )


if _REACT_DIST.is_dir() and (_REACT_DIST / "index.html").is_file():
    app.mount(
        "/react",
        StaticFiles(directory=str(_REACT_DIST), html=True),
        name="react_spa",
    )
