import torch
from torchvision import models, transforms
from PIL import Image
import os
import torch.nn.functional as F
from disease_info import disease_details
import google.generativeai as genai
from typing import Dict, Optional

# Try to load environment variables from .env file
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass  # python-dotenv not installed, skip

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

# Initialize Gemini API (optional - will use fallback if not configured)
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if GEMINI_API_KEY:
    try:
        genai.configure(api_key=GEMINI_API_KEY)
        # Use gemini-2.5-flash (fast and capable) or gemini-flash-latest
        gemini_model = genai.GenerativeModel('gemini-2.5-flash')
        GEMINI_AVAILABLE = True
        print("Gemini API configured successfully")
    except Exception as e:
        print(f"Warning: Gemini API configuration failed: {e}")
        GEMINI_AVAILABLE = False
else:
    GEMINI_AVAILABLE = False
    print("Warning: GEMINI_API_KEY not set. Using fallback disease information.")

def get_disease_info_from_gemini(disease_name: str) -> Optional[Dict[str, str]]:
    """
    Get disease description and treatment from Gemini API.
    Returns None if API call fails.
    """
    if not GEMINI_AVAILABLE:
        print("Gemini API not available")
        return None
    
    try:
        # Format disease name for better prompt
        formatted_name = disease_name.replace("_", " ").replace("___", " ").replace("__", " ").title()
        
        prompt = f"""You are a plant disease expert. Provide detailed information about this plant disease: {formatted_name}

Please provide:
1. A clear description of the disease (2-3 sentences explaining what it is, symptoms, and causes)
2. Treatment recommendations (3-5 actionable steps to treat or manage the disease)

IMPORTANT: Format your response EXACTLY as follows:
DESCRIPTION: [your description here]
TREATMENT: [your treatment steps here]

Be concise, accurate, and practical. Focus on actionable advice."""

        print(f"Calling Gemini API for: {formatted_name}")
        response = gemini_model.generate_content(prompt)
        
        # Handle different response types
        if hasattr(response, 'text'):
            text = response.text
        elif hasattr(response, 'candidates') and response.candidates:
            text = response.candidates[0].content.parts[0].text
        else:
            print("Unexpected response format from Gemini")
            return None
        
        print(f"Gemini response received: {text[:200]}...")
        
        # Parse the response
        description = ""
        treatment = ""
        
        # Try to find DESCRIPTION and TREATMENT markers
        text_upper = text.upper()
        desc_idx = text_upper.find("DESCRIPTION:")
        treat_idx = text_upper.find("TREATMENT:")
        
        if desc_idx != -1 and treat_idx != -1:
            # Both markers found
            description = text[desc_idx + len("DESCRIPTION:"):treat_idx].strip()
            treatment = text[treat_idx + len("TREATMENT:"):].strip()
        elif desc_idx != -1:
            # Only DESCRIPTION found
            description = text[desc_idx + len("DESCRIPTION:"):].strip()
            # Try to find treatment in remaining text
            remaining = text[desc_idx + len("DESCRIPTION:"):]
            if "treatment" in remaining.lower() or "remedy" in remaining.lower():
                treat_start = remaining.lower().find("treatment")
                if treat_start == -1:
                    treat_start = remaining.lower().find("remedy")
                if treat_start != -1:
                    treatment = remaining[treat_start:].strip()
        elif treat_idx != -1:
            # Only TREATMENT found
            treatment = text[treat_idx + len("TREATMENT:"):].strip()
            description = text[:treat_idx].strip()
        else:
            # No markers found, try to split by paragraphs or common patterns
            paragraphs = [p.strip() for p in text.split("\n\n") if p.strip()]
            if len(paragraphs) >= 2:
                description = paragraphs[0]
                treatment = "\n".join(paragraphs[1:])
            elif len(paragraphs) == 1:
                # Single paragraph, try to split by sentences
                sentences = [s.strip() for s in text.split(". ") if s.strip()]
                mid = len(sentences) // 2
                description = ". ".join(sentences[:mid]) + ("." if mid > 0 else "")
                treatment = ". ".join(sentences[mid:]) + ("." if mid < len(sentences) else "")
            else:
                description = text[:300] if len(text) > 300 else text
                treatment = "Please consult with a plant expert for specific treatment recommendations."
        
        # Clean up the text
        description = description.strip().replace("\n", " ").replace("  ", " ")
        treatment = treatment.strip().replace("\n", " ").replace("  ", " ")
        
        # Remove any remaining markers
        description = description.replace("DESCRIPTION:", "").replace("description:", "").strip()
        treatment = treatment.replace("TREATMENT:", "").replace("treatment:", "").strip()
        
        if not description:
            description = "No description available."
        if not treatment:
            treatment = "No treatment information available."
        
        print(f"Parsed - Description: {description[:50]}..., Treatment: {treatment[:50]}...")
        
        return {
            "description": description,
            "treatment": treatment
        }
    except Exception as e:
        print(f"Error fetching info from Gemini: {type(e).__name__}: {e}")
        import traceback
        traceback.print_exc()
        return None


def get_fertilizer_recommendation(
    temperature: float,
    humidity: float,
    moisture: float,
    soil_type: str,
    crop_type: str,
    nitrogen: float,
    phosphorous: float
) -> Optional[str]:
    """
    Get fertilizer recommendations from Gemini API based on soil and crop conditions.
    Returns None if API call fails.
    """
    if not GEMINI_AVAILABLE:
        print("Gemini API not available for fertilizer recommendations")
        return None
    
    try:
        # Create a safer, more neutral prompt that won't trigger safety filters
        prompt = f"""Provide agricultural fertilizer guidance for {crop_type} cultivation in {soil_type} soil conditions.

Agricultural parameters:
- Crop: {crop_type}
- Soil type: {soil_type}
- Temperature: {temperature} degrees Celsius
- Humidity: {humidity} percent
- Soil moisture: {moisture} percent
- Current nitrogen: {nitrogen} kilograms per hectare
- Current phosphorous: {phosphorous} kilograms per hectare

Please provide educational information about:
1. Nutrient requirements for {crop_type} growth
2. Suitable fertilizer types and NPK ratios for {soil_type} soil
3. Suggested application rates for nitrogen, phosphorous, and potassium in kg/ha
4. Best timing for fertilizer application
5. Additional nutrients that may benefit {crop_type}
6. General considerations for soil health and crop nutrition

Format the response clearly with specific recommendations and practical guidance."""

        print(f"Calling Gemini API for fertilizer recommendations: {crop_type} on {soil_type} soil")
        
        # Configure generation config with safety settings
        generation_config = {
            "temperature": 0.7,
            "top_p": 0.8,
            "top_k": 40,
            "max_output_tokens": 4096,  # Increased for complete responses
        }
        
        safety_settings = [
            {"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_NONE"},
            {"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_NONE"},
            {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_NONE"},
            {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_ONLY_HIGH"},
        ]
        
        response = gemini_model.generate_content(
            prompt,
            generation_config=generation_config,
            safety_settings=safety_settings
        )
        
        # Check if response has candidates
        if not hasattr(response, 'candidates') or not response.candidates:
            print("No candidates in Gemini response")
            return None
        
        # Check the first candidate
        candidate = response.candidates[0]
        
        # Check finish_reason - 1 means content was blocked/filtered
        if hasattr(candidate, 'finish_reason'):
            finish_reason = candidate.finish_reason
            if finish_reason == 1:  # SAFETY (blocked)
                print("Gemini response was blocked/filtered (safety)")
                # Provide a helpful fallback recommendation based on the inputs
                return generate_fallback_recommendation(crop_type, soil_type, temperature, nitrogen, phosphorous)
            elif finish_reason == 2:  # MAX_TOKENS
                print("Warning: Gemini response hit max tokens - response may be incomplete")
                # Continue to extract what we have, but note it might be incomplete
            elif finish_reason == 3:  # STOP
                print("Gemini response stopped normally")
            elif finish_reason == 4:  # RECITATION
                print("Gemini response was recitation")
        
        # Try to get text from response - handle multiple parts if needed
        text = None
        try:
            # Method 1: Try the quick accessor
            if hasattr(response, 'text'):
                text = response.text
                print("Extracted text using response.text")
        except (ValueError, AttributeError) as e:
            print(f"Error accessing response.text: {e}")
            text = None
        
        # Method 2: Manual extraction from candidate content parts (more reliable for complete responses)
        if not text or len(text) < 100:
            try:
                if hasattr(candidate, 'content') and candidate.content:
                    if hasattr(candidate.content, 'parts') and candidate.content.parts:
                        # Combine ALL parts in case response is split across multiple parts
                        text_parts = []
                        for part in candidate.content.parts:
                            if hasattr(part, 'text') and part.text:
                                text_parts.append(part.text.strip())
                        if text_parts:
                            # Join with newlines to preserve formatting
                            text = '\n\n'.join(text_parts)
                            print(f"Extracted text from {len(text_parts)} part(s) using candidate.content.parts")
            except Exception as e2:
                print(f"Error extracting text from candidate: {e2}")
        
        # Method 3: Try alternative extraction through all candidates
        if not text or len(text) < 100:
            try:
                if hasattr(response, 'candidates') and response.candidates:
                    for cand in response.candidates:
                        if hasattr(cand, 'content') and cand.content:
                            if hasattr(cand.content, 'parts') and cand.content.parts:
                                text_parts = []
                                for part in cand.content.parts:
                                    if hasattr(part, 'text') and part.text:
                                        text_parts.append(part.text.strip())
                                if text_parts:
                                    text = '\n\n'.join(text_parts)
                                    print(f"Extracted text from alternative candidate method")
                                    break
            except Exception as e3:
                print(f"Alternative extraction method failed: {e3}")
        
        if not text:
            print("Could not extract text from Gemini response")
            # Provide fallback recommendation
            return generate_fallback_recommendation(crop_type, soil_type, temperature, nitrogen, phosphorous)
        
        # Log the full response length for debugging
        print(f"Gemini fertilizer response received: {len(text)} characters")
        print(f"First 300 chars: {text[:300]}...")
        if len(text) > 300:
            print(f"Last 300 chars: ...{text[-300:]}")
        
        # Return the full recommendation text
        full_text = text.strip()
        
        # Check if response seems incomplete (ends abruptly)
        if len(full_text) < 500:
            print("Warning: Response seems unusually short, might be incomplete")
        
        return full_text
        
    except Exception as e:
        print(f"Error fetching fertilizer recommendation from Gemini: {type(e).__name__}: {e}")
        import traceback
        traceback.print_exc()
        # Provide fallback recommendation instead of returning None
        return generate_fallback_recommendation(crop_type, soil_type, temperature, nitrogen, phosphorous)


def generate_fallback_recommendation(crop_type: str, soil_type: str, temperature: float, nitrogen: float, phosphorous: float) -> str:
    """
    Generate a basic fertilizer recommendation when Gemini API is unavailable or blocked.
    This provides helpful guidance based on standard agricultural practices.
    """
    # Calculate recommended nitrogen (typical range: 100-150 kg/ha for most crops)
    optimal_n = 120.0
    n_deficit = max(0, optimal_n - nitrogen)
    
    # Calculate recommended phosphorous (typical range: 40-60 kg/ha)
    optimal_p = 50.0
    p_deficit = max(0, optimal_p - phosphorous)
    
    # Determine fertilizer types based on soil type
    if soil_type.lower() in ['sandy', 'sandy loam']:
        fertilizer_note = "For sandy soils, consider slow-release fertilizers and split applications to prevent nutrient leaching."
    elif soil_type.lower() in ['clay', 'clay loam']:
        fertilizer_note = "Clay soils retain nutrients well but may need organic matter to improve structure."
    else:
        fertilizer_note = f"{soil_type} soil generally has good nutrient retention properties."
    
    recommendation = f"""**Fertilizer Recommendations for {crop_type}**

**Current Nutrient Status:**
- Current Nitrogen: {nitrogen} kg/ha
- Current Phosphorous: {phosphorous} kg/ha

**Recommended Nutrient Levels:**
- Target Nitrogen: 100-150 kg/ha
- Target Phosphorous: 40-60 kg/ha

**Fertilizer Suggestions:**

1. **Nitrogen Application:**
   - Recommended additional nitrogen: {n_deficit:.1f} kg/ha
   - Suitable fertilizers: Urea (46% N), Ammonium Nitrate (34% N), or NPK blends
   - Application: Split into 2-3 applications during the growing season

2. **Phosphorous Application:**
   - Recommended additional phosphorous: {p_deficit:.1f} kg/ha
   - Suitable fertilizers: DAP (Diammonium Phosphate, 18-46-0), Single Super Phosphate (SSP)
   - Application: Apply before planting or during early growth stage

3. **Potassium:**
   - Recommended: 50-80 kg/ha of K2O
   - Suitable fertilizers: Muriate of Potash (MOP, 60% K2O), Sulphate of Potash (SOP, 50% K2O)

4. **Soil-Specific Notes:**
   {fertilizer_note}

5. **Application Guidelines:**
   - Apply fertilizers when soil moisture is adequate
   - Avoid application during extreme weather conditions
   - Consider soil pH testing before application
   - Follow local agricultural extension service guidelines

**Important:** These are general recommendations. For precise fertilizer requirements, please consult with a local agricultural expert or conduct soil testing for your specific field conditions.

**Note:** This recommendation is based on standard agricultural practices. For optimal results, consider professional soil testing and crop-specific nutrient management plans."""
    
    return recommendation


def predict(image_path):
    img = Image.open(image_path).convert("RGB")
    x = transform(img).unsqueeze(0)

    with torch.no_grad():
        logits = model(x)
        probs = F.softmax(logits, dim=1)
        confidence, pred_idx = torch.max(probs, 1)

    predicted_class = CLASSES[pred_idx.item()]
    confidence = float(confidence.item()) * 100

    # Try to get info from Gemini first, fallback to static data
    info = None
    if GEMINI_AVAILABLE:
        info = get_disease_info_from_gemini(predicted_class)
    
    # Fallback to static data if Gemini fails or is not available
    if not info:
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
