# app/app_fastapi.py
import os
import shutil
from fastapi import FastAPI, UploadFile, File, Request
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from predict import predict  # uses your existing predict(image_path) -> dict

app = FastAPI(title="Plant Disease Detector")

# static & templates
app.mount("/static", StaticFiles(directory="app/static"), name="static")
templates = Jinja2Templates(directory="app/templates")

@app.get("/", response_class=HTMLResponse)
def index(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})

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
