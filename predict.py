import torch
from torchvision import models, transforms
from PIL import Image
import os
import torch.nn.functional as F
from disease_info import disease_details

# Load class names dynamically
CLASSES = sorted(os.listdir("dataset/train"))

# Load EfficientNet model
model = models.efficientnet_b0(weights=None)
model.classifier[1] = torch.nn.Linear(model.classifier[1].in_features, len(CLASSES))
model.load_state_dict(torch.load("model/plant_model.pth", map_location="cpu"))
model.eval()

# Transform for prediction
transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor()
])

def predict(image_path):
    img = Image.open(image_path).convert("RGB")
    x = transform(img).unsqueeze(0)

    with torch.no_grad():
        logits = model(x)
        probs = F.softmax(logits, dim=1)
        confidence, pred_idx = torch.max(probs, 1)

    predicted_class = CLASSES[pred_idx.item()]
    confidence = float(confidence.item()) * 100

    info = disease_details.get(predicted_class, {
        "description": "No description available.",
        "treatment": "No treatment information available."
    })

    return {
        "class": predicted_class,
        "confidence": round(confidence, 2),
        "description": info["description"],
        "treatment": info["treatment"]
    }
