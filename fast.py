from fastapi import FastAPI, UploadFile
from predict import predict

app = FastAPI()

@app.post("/predict")
async def detect(file: UploadFile):
    path = "temp.jpg"
    with open(path, "wb") as f:
        f.write(await file.read())
    result = predict(path)
    return {"prediction": result}
