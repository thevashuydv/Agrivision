# AgriVision - Plant Disease Detection System

A deep learning-based plant disease detection system using EfficientNet-B0. This project can detect various diseases in tomato, potato, and pepper plants from leaf images.

## Features

- 🌿 Web-based interface for uploading and analyzing leaf images
- 📷 Real-time camera detection
- 🎯 Disease classification with confidence scores
- 📋 AI-powered disease descriptions and treatment recommendations (via Google Gemini API)
- 🔄 Automatic fallback to static data if API is unavailable

## Prerequisites

- Python 3.8 or higher
- A trained model file at `model/plant_model.pth` (should already be included)
- Webcam (optional, for real-time detection)

## Installation

1. **Clone or navigate to the project directory:**
   ```bash
   cd plant_disease_project
   ```

2. **Create a virtual environment (recommended):**
   ```bash
   python3 -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Set up Clerk Authentication (Required):**
   
   The app uses Clerk for user authentication and dashboard access.
   
   - Sign up for a free account at [Clerk](https://clerk.com)
   - Create a new application
   - Get your API keys from the Clerk dashboard:
     - Publishable Key (starts with `pk_`)
     - Secret Key (starts with `sk_`)
     - Frontend API URL (e.g., `https://your-app.clerk.accounts.dev`)
   - Add them to your `.env` file:
     ```
     CLERK_PUBLISHABLE_KEY=pk_test_...
     CLERK_SECRET_KEY=sk_test_...
     CLERK_FRONTEND_API=https://your-app.clerk.accounts.dev
     ```

5. **Set up Google Gemini API (Optional but Recommended):**
   
   The app uses Google Gemini AI to provide detailed, dynamic disease descriptions and treatment recommendations.
   
   - Get your free API key from [Google AI Studio](https://makersuite.google.com/app/apikey)
   - Add it to your `.env` file:
     ```
     GEMINI_API_KEY=your_api_key_here
     ```
   
   **Note:** If the API key is not set, the app will automatically use fallback information from `disease_info.py`. The app gracefully handles API failures and will always provide disease information.

## Running the Project

### Option 1: Web Application (Recommended)

Run the FastAPI web application for a user-friendly interface:

```bash
uvicorn app.app_fastapi:app --reload --host 0.0.0.0 --port 8000
```

Then open your browser and navigate to:
- **Local:** http://localhost:8000
- **Network:** http://0.0.0.0:8000

The web interface allows you to:
- Upload leaf images via drag & drop or file browser
- View disease predictions with confidence scores
- Read disease descriptions and treatment recommendations

### Option 2: Real-Time Camera Detection

Run the real-time camera script for live detection:

```bash
python camera_realtime.py
```

**Controls:**
- Press `q` to quit the camera feed

**Note:** Make sure your webcam is connected and accessible.

### Option 3: Command-Line Prediction

You can also use the prediction script directly:

```python
from predict import predict

result = predict("path/to/your/image.jpg")
print(result)
```

## Project Structure

```
plant_disease_project/
├── app/
│   ├── app_fastapi.py      # FastAPI web application
│   ├── static/             # CSS and static files
│   └── templates/          # HTML templates
├── dataset/                # Training dataset (train/test/valid splits)
├── model/
│   └── plant_model.pth     # Trained EfficientNet model
├── camera_realtime.py      # Real-time camera detection
├── predict.py             # Prediction function
├── disease_info.py         # Disease information database
├── train_effnet.py         # Training script
├── evaluate.py             # Model evaluation script
└── requirements.txt        # Python dependencies
```

## Supported Diseases

The model can detect:
- **Tomato:** Healthy, Early Blight, Late Blight, Bacterial Spot, Target Spot, Mosaic Virus, Yellow Leaf Curl Virus, Leaf Mold, Septoria Leaf Spot, Spider Mites
- **Potato:** Healthy, Early Blight, Late Blight
- **Pepper:** Healthy, Bacterial Spot

## Troubleshooting

1. **Model not found error:**
   - Ensure `model/plant_model.pth` exists in the project directory

2. **Port already in use:**
   - Change the port: `uvicorn app.app_fastapi:app --reload --port 8080`

3. **Camera not working:**
   - Check camera permissions
   - Try changing the camera index in `camera_realtime.py` (line 35): `cv2.VideoCapture(1)`

4. **Import errors:**
   - Make sure all dependencies are installed: `pip install -r requirements.txt`
   - Verify you're using the correct Python environment

## Development

- **Training:** Use `train_effnet.py` to train the model
- **Evaluation:** Use `evaluate.py` to evaluate model performance
- **Data splitting:** Use `split.py` to split dataset into train/test/valid

## License

This project is for educational purposes.

