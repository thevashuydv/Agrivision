# app/weather_api.py
from fastapi import APIRouter, HTTPException, Query
from typing import Optional
from datetime import datetime, timedelta
import os
import httpx
import math

router = APIRouter(prefix="/api/weather", tags=["weather"])

# OpenWeatherMap API configuration
OPENWEATHER_API_KEY = os.getenv("OPENWEATHER_API_KEY", "")
OPENWEATHER_BASE_URL = "https://api.openweathermap.org/data/2.5"

# Base temperature for GDD calculation (typically 10°C or 50°F for most crops)
BASE_TEMP_C = 10.0
BASE_TEMP_F = 50.0


async def get_weather_data(lat: float, lon: float, endpoint: str = "weather"):
    """Fetch weather data from OpenWeatherMap API"""
    if not OPENWEATHER_API_KEY:
        raise HTTPException(
            status_code=503,
            detail="OpenWeatherMap API key not configured. Please add OPENWEATHER_API_KEY to your .env file"
        )
    
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            url = f"{OPENWEATHER_BASE_URL}/{endpoint}"
            params = {
                "lat": lat,
                "lon": lon,
                "appid": OPENWEATHER_API_KEY,
                "units": "metric"  # Use metric units (Celsius)
            }
            
            response = await client.get(url, params=params)
            
            if response.status_code == 401:
                raise HTTPException(status_code=401, detail="Invalid OpenWeatherMap API key")
            elif response.status_code == 404:
                raise HTTPException(status_code=404, detail="Location not found")
            elif response.status_code != 200:
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"Weather API error: {response.text}"
                )
            
            return response.json()
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="Weather API request timeout")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching weather data: {str(e)}")


def calculate_gdd(temp_min: float, temp_max: float, base_temp: float = BASE_TEMP_C) -> float:
    """
    Calculate Growing Degree Days (GDD)
    GDD = (T_max + T_min) / 2 - T_base
    If result is negative, GDD = 0
    """
    avg_temp = (temp_max + temp_min) / 2
    gdd = avg_temp - base_temp
    return max(0, gdd)


def get_weather_alerts(weather_data: dict, forecast_data: dict = None) -> list:
    """Generate agricultural weather alerts"""
    alerts = []
    
    # Current weather alerts
    if 'main' in weather_data:
        temp = weather_data['main'].get('temp', 0)
        feels_like = weather_data['main'].get('feels_like', temp)
        humidity = weather_data['main'].get('humidity', 0)
        rain = weather_data.get('rain', {}).get('1h', 0) or weather_data.get('rain', {}).get('3h', 0)
        
        # Frost alert (temperature below 0°C)
        if temp < 0 or feels_like < 0:
            alerts.append({
                "type": "frost",
                "severity": "high",
                "message": "⚠️ Frost Warning: Freezing temperatures detected. Protect sensitive crops.",
                "icon": "❄️"
            })
        elif temp < 5:
            alerts.append({
                "type": "cold",
                "severity": "medium",
                "message": "🌡️ Cold Weather: Low temperatures may affect crop growth.",
                "icon": "🌡️"
            })
        
        # Drought alert (low humidity)
        if humidity < 30:
            alerts.append({
                "type": "drought",
                "severity": "medium",
                "message": "🌵 Low Humidity: Consider irrigation to prevent drought stress.",
                "icon": "🌵"
            })
        
        # Excessive rain alert
        if rain > 20:  # mm per hour
            alerts.append({
                "type": "excessive_rain",
                "severity": "high",
                "message": "🌧️ Heavy Rainfall: Risk of waterlogging. Ensure proper drainage.",
                "icon": "🌧️"
            })
        elif rain > 10:
            alerts.append({
                "type": "rain",
                "severity": "medium",
                "message": "🌦️ Moderate Rainfall: Monitor soil moisture levels.",
                "icon": "🌦️"
            })
    
    # Forecast alerts
    if forecast_data and 'list' in forecast_data:
        for forecast in forecast_data['list'][:8]:  # Check next 24 hours
            temp_min = forecast['main'].get('temp_min', 0)
            temp_max = forecast['main'].get('temp_max', 0)
            rain = forecast.get('rain', {}).get('3h', 0)
            
            if temp_min < 0:
                alerts.append({
                    "type": "frost_forecast",
                    "severity": "high",
                    "message": f"❄️ Frost Forecast: Freezing temperatures expected in the next 24 hours.",
                    "icon": "❄️"
                })
                break  # Only show once
    
    return alerts


def get_agricultural_insights(weather_data: dict, forecast_data: dict = None) -> dict:
    """Generate agricultural insights from weather data"""
    insights = {
        "planting_conditions": "good",
        "irrigation_needed": False,
        "harvest_conditions": "good",
        "recommendations": []
    }
    
    if 'main' in weather_data:
        temp = weather_data['main'].get('temp', 20)
        humidity = weather_data['main'].get('humidity', 50)
        pressure = weather_data['main'].get('pressure', 1013)
        wind_speed = weather_data.get('wind', {}).get('speed', 0)
        rain = weather_data.get('rain', {}).get('1h', 0) or weather_data.get('rain', {}).get('3h', 0)
        
        # Planting conditions
        if 15 <= temp <= 30 and humidity >= 40 and rain < 5:
            insights["planting_conditions"] = "excellent"
            insights["recommendations"].append("✅ Ideal conditions for planting")
        elif temp < 10 or temp > 35:
            insights["planting_conditions"] = "poor"
            insights["recommendations"].append("⚠️ Extreme temperatures - delay planting if possible")
        else:
            insights["planting_conditions"] = "moderate"
        
        # Irrigation needs
        if humidity < 40 and rain < 1:
            insights["irrigation_needed"] = True
            insights["recommendations"].append("💧 Low humidity and no rain - irrigation recommended")
        
        # Harvest conditions
        if rain < 2 and wind_speed < 15:
            insights["harvest_conditions"] = "excellent"
            insights["recommendations"].append("🌾 Good conditions for harvesting")
        elif rain > 10:
            insights["harvest_conditions"] = "poor"
            insights["recommendations"].append("🌧️ Heavy rain - avoid harvesting")
        
        # Wind conditions
        if wind_speed > 20:
            insights["recommendations"].append("💨 Strong winds - protect crops and structures")
    
    return insights


@router.get("/current")
async def get_current_weather(
    lat: float = Query(..., description="Latitude"),
    lon: float = Query(..., description="Longitude")
):
    """Get current weather conditions"""
    weather_data = await get_weather_data(lat, lon, "weather")
    
    alerts = get_weather_alerts(weather_data)
    insights = get_agricultural_insights(weather_data)
    
    return {
        "location": {
            "name": weather_data.get('name', 'Unknown'),
            "country": weather_data.get('sys', {}).get('country', ''),
            "lat": lat,
            "lon": lon
        },
        "current": {
            "temp": round(weather_data['main']['temp'], 1),
            "feels_like": round(weather_data['main']['feels_like'], 1),
            "humidity": weather_data['main']['humidity'],
            "pressure": weather_data['main']['pressure'],
            "wind_speed": round(weather_data.get('wind', {}).get('speed', 0) * 3.6, 1),  # Convert m/s to km/h
            "wind_direction": weather_data.get('wind', {}).get('deg', 0),
            "clouds": weather_data.get('clouds', {}).get('all', 0),
            "visibility": weather_data.get('visibility', 0) / 1000 if weather_data.get('visibility') else None,  # Convert to km
            "rain": weather_data.get('rain', {}).get('1h', 0) or weather_data.get('rain', {}).get('3h', 0),
            "description": weather_data['weather'][0]['description'].title(),
            "icon": weather_data['weather'][0]['icon'],
            "sunrise": datetime.fromtimestamp(weather_data['sys']['sunrise']).isoformat(),
            "sunset": datetime.fromtimestamp(weather_data['sys']['sunset']).isoformat()
        },
        "alerts": alerts,
        "insights": insights
    }


@router.get("/forecast")
async def get_weather_forecast(
    lat: float = Query(..., description="Latitude"),
    lon: float = Query(..., description="Longitude"),
    days: int = Query(7, ge=1, le=7, description="Number of days (1-7)")
):
    """Get weather forecast for specified days"""
    forecast_data = await get_weather_data(lat, lon, "forecast")
    
    # Get current weather for alerts
    current_weather = await get_weather_data(lat, lon, "weather")
    alerts = get_weather_alerts(current_weather, forecast_data)
    
    # Process forecast data
    forecast_list = []
    daily_data = {}
    
    for item in forecast_data.get('list', []):
        dt = datetime.fromtimestamp(item['dt'])
        date_key = dt.date()
        
        if date_key not in daily_data:
            daily_data[date_key] = {
                "date": date_key.isoformat(),
                "temp_min": item['main']['temp_min'],
                "temp_max": item['main']['temp_max'],
                "humidity": [],
                "rain": 0,
                "wind_speed": [],
                "conditions": []
            }
        
        # Update min/max temps
        daily_data[date_key]["temp_min"] = min(daily_data[date_key]["temp_min"], item['main']['temp_min'])
        daily_data[date_key]["temp_max"] = max(daily_data[date_key]["temp_max"], item['main']['temp_max'])
        
        # Collect other data
        daily_data[date_key]["humidity"].append(item['main']['humidity'])
        daily_data[date_key]["wind_speed"].append(item.get('wind', {}).get('speed', 0) * 3.6)
        
        # Rain
        rain = item.get('rain', {}).get('3h', 0)
        if rain:
            daily_data[date_key]["rain"] += rain
        
        # Conditions
        daily_data[date_key]["conditions"].append({
            "time": dt.isoformat(),
            "description": item['weather'][0]['description'].title(),
            "icon": item['weather'][0]['icon'],
            "temp": round(item['main']['temp'], 1)
        })
    
    # Convert to list and calculate averages
    for date_key in sorted(daily_data.keys())[:days]:
        day = daily_data[date_key]
        day["temp_avg"] = round((day["temp_min"] + day["temp_max"]) / 2, 1)
        day["humidity_avg"] = round(sum(day["humidity"]) / len(day["humidity"]), 1) if day["humidity"] else 0
        day["wind_speed_avg"] = round(sum(day["wind_speed"]) / len(day["wind_speed"]), 1) if day["wind_speed"] else 0
        day["gdd"] = round(calculate_gdd(day["temp_min"], day["temp_max"]), 1)
        
        # Get primary condition for the day
        if day["conditions"]:
            day["description"] = day["conditions"][len(day["conditions"]) // 2]["description"]
            day["icon"] = day["conditions"][len(day["conditions"]) // 2]["icon"]
        
        # Clean up
        del day["humidity"]
        del day["wind_speed"]
        
        forecast_list.append(day)
    
    # Calculate cumulative GDD
    cumulative_gdd = sum(day["gdd"] for day in forecast_list)
    
    return {
        "location": {
            "name": forecast_data.get('city', {}).get('name', 'Unknown'),
            "country": forecast_data.get('city', {}).get('country', ''),
            "lat": lat,
            "lon": lon
        },
        "forecast": forecast_list,
        "cumulative_gdd": round(cumulative_gdd, 1),
        "alerts": alerts
    }


@router.get("/gdd")
async def calculate_gdd_for_period(
    lat: float = Query(..., description="Latitude"),
    lon: float = Query(..., description="Longitude"),
    days: int = Query(7, ge=1, le=30, description="Number of days"),
    base_temp: float = Query(BASE_TEMP_C, description="Base temperature in Celsius")
):
    """Calculate Growing Degree Days for a period"""
    forecast_data = await get_weather_data(lat, lon, "forecast")
    
    daily_gdd = []
    cumulative_gdd = 0
    
    daily_data = {}
    for item in forecast_data.get('list', []):
        dt = datetime.fromtimestamp(item['dt'])
        date_key = dt.date()
        
        if date_key not in daily_data:
            daily_data[date_key] = {
                "temp_min": item['main']['temp_min'],
                "temp_max": item['main']['temp_max']
            }
        else:
            daily_data[date_key]["temp_min"] = min(daily_data[date_key]["temp_min"], item['main']['temp_min'])
            daily_data[date_key]["temp_max"] = max(daily_data[date_key]["temp_max"], item['main']['temp_max'])
    
    for date_key in sorted(daily_data.keys())[:days]:
        gdd = calculate_gdd(daily_data[date_key]["temp_min"], daily_data[date_key]["temp_max"], base_temp)
        cumulative_gdd += gdd
        daily_gdd.append({
            "date": date_key.isoformat(),
            "temp_min": round(daily_data[date_key]["temp_min"], 1),
            "temp_max": round(daily_data[date_key]["temp_max"], 1),
            "gdd": round(gdd, 1),
            "cumulative_gdd": round(cumulative_gdd, 1)
        })
    
    return {
        "base_temp": base_temp,
        "period_days": days,
        "daily_gdd": daily_gdd,
        "total_gdd": round(cumulative_gdd, 1)
    }


@router.get("/search")
async def search_location(
    q: str = Query(..., description="Location name or coordinates")
):
    """Search for location coordinates"""
    if not OPENWEATHER_API_KEY:
        raise HTTPException(
            status_code=503,
            detail="OpenWeatherMap API key not configured"
        )
    
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            # Try geocoding API
            url = "http://api.openweathermap.org/geo/1.0/direct"
            params = {
                "q": q,
                "limit": 5,
                "appid": OPENWEATHER_API_KEY
            }
            
            response = await client.get(url, params=params)
            
            if response.status_code != 200:
                raise HTTPException(
                    status_code=response.status_code,
                    detail="Error searching location"
                )
            
            locations = response.json()
            
            return {
                "locations": [
                    {
                        "name": loc.get('name', ''),
                        "country": loc.get('country', ''),
                        "state": loc.get('state', ''),
                        "lat": loc.get('lat', 0),
                        "lon": loc.get('lon', 0),
                        "display_name": f"{loc.get('name', '')}, {loc.get('state', '')}, {loc.get('country', '')}".strip(', ')
                    }
                    for loc in locations
                ]
            }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error searching location: {str(e)}")

