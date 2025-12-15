// Weather Lens JavaScript
class WeatherManager {
  constructor() {
    this.currentLocation = null;
    this.currentLat = null;
    this.currentLon = null;
    this.init();
  }

  init() {
    this.setupEventListeners();
    // Try to get user's location on load
    this.getUserLocation();
  }

  setupEventListeners() {
    // Location search
    document.getElementById('search-location-btn')?.addEventListener('click', () => {
      this.searchLocation();
    });

    document.getElementById('weather-location-input')?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.searchLocation();
      }
    });

    // Use current location
    document.getElementById('use-current-location-btn')?.addEventListener('click', () => {
      this.getUserLocation();
    });

    // GDD Calculator
    document.getElementById('calculate-gdd-btn')?.addEventListener('click', () => {
      this.calculateGDD();
    });
  }

  async getUserLocation() {
    if (!navigator.geolocation) {
      this.showError('Geolocation is not supported by your browser');
      return;
    }

    const btn = document.getElementById('use-current-location-btn');
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Getting location...';
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        this.currentLat = position.coords.latitude;
        this.currentLon = position.coords.longitude;
        await this.loadWeatherData();
        if (btn) {
          btn.disabled = false;
          btn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg> Use My Location';
        }
      },
      (error) => {
        this.showError('Unable to get your location. Please search for a location manually.');
        if (btn) {
          btn.disabled = false;
          btn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg> Use My Location';
        }
      }
    );
  }

  async searchLocation() {
    const query = document.getElementById('weather-location-input').value.trim();
    if (!query) {
      this.showError('Please enter a location name');
      return;
    }

    try {
      const response = await fetch(`/api/weather/search?q=${encodeURIComponent(query)}`);
      const data = await response.json();

      if (data.locations && data.locations.length > 0) {
        this.showLocationResults(data.locations);
      } else {
        this.showError('No locations found. Please try a different search term.');
      }
    } catch (error) {
      this.showError('Error searching location. Please try again.');
      console.error('Location search error:', error);
    }
  }

  showLocationResults(locations) {
    const resultsDiv = document.getElementById('location-results');
    if (!resultsDiv) return;

    resultsDiv.innerHTML = locations.map(loc => `
      <div class="location-result-item" onclick="weatherManager.selectLocation(${loc.lat}, ${loc.lon}, '${loc.display_name}')">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
          <circle cx="12" cy="10" r="3"></circle>
        </svg>
        <span>${loc.display_name}</span>
      </div>
    `).join('');

    resultsDiv.classList.remove('hidden');
  }

  async selectLocation(lat, lon, name) {
    this.currentLat = lat;
    this.currentLon = lon;
    this.currentLocation = name;
    
    document.getElementById('weather-location-input').value = name;
    document.getElementById('location-results').classList.add('hidden');
    
    await this.loadWeatherData();
  }

  async loadWeatherData() {
    if (!this.currentLat || !this.currentLon) {
      this.showError('Please select a location first');
      return;
    }

    try {
      // Load current weather
      await this.loadCurrentWeather();
      
      // Load forecast
      await this.loadForecast();
    } catch (error) {
      this.showError('Error loading weather data. Please check your API key configuration.');
      console.error('Weather load error:', error);
    }
  }

  async loadCurrentWeather() {
    try {
      const response = await fetch(`/api/weather/current?lat=${this.currentLat}&lon=${this.currentLon}`);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to load weather data');
      }

      const data = await response.json();
      this.displayCurrentWeather(data);
    } catch (error) {
      this.showError(error.message);
    }
  }

  displayCurrentWeather(data) {
    const container = document.getElementById('current-weather');
    if (!container) return;

    // Location
    document.getElementById('weather-location-name').textContent = 
      `${data.location.name}, ${data.location.country}`;
    document.getElementById('weather-date').textContent = 
      new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    // Main weather
    document.getElementById('weather-temp').textContent = Math.round(data.current.temp);
    document.getElementById('weather-description').textContent = data.current.description;
    
    // Weather icon
    const iconUrl = `https://openweathermap.org/img/wn/${data.current.icon}@2x.png`;
    document.getElementById('weather-icon').innerHTML = `<img src="${iconUrl}" alt="${data.current.description}">`;

    // Details
    document.getElementById('weather-feels-like').textContent = `${Math.round(data.current.feels_like)}°C`;
    document.getElementById('weather-humidity').textContent = `${data.current.humidity}%`;
    document.getElementById('weather-wind').textContent = `${data.current.wind_speed} km/h`;
    document.getElementById('weather-pressure').textContent = `${data.current.pressure} hPa`;

    // Alerts
    this.displayAlerts(data.alerts);

    // Insights
    this.displayInsights(data.insights);

    container.classList.remove('hidden');
  }

  displayAlerts(alerts) {
    const alertsDiv = document.getElementById('weather-alerts');
    if (!alertsDiv) return;

    if (alerts && alerts.length > 0) {
      alertsDiv.innerHTML = alerts.map(alert => `
        <div class="weather-alert alert-${alert.severity}">
          <span class="alert-icon">${alert.icon}</span>
          <span class="alert-message">${alert.message}</span>
        </div>
      `).join('');
      alertsDiv.classList.remove('hidden');
    } else {
      alertsDiv.classList.add('hidden');
    }
  }

  displayInsights(insights) {
    const insightsDiv = document.getElementById('insights-content');
    if (!insightsDiv) return;

    const conditionsClass = {
      'excellent': 'insight-excellent',
      'good': 'insight-good',
      'moderate': 'insight-moderate',
      'poor': 'insight-poor'
    };

    insightsDiv.innerHTML = `
      <div class="insight-row">
        <div class="insight-item">
          <span class="insight-label">Planting Conditions:</span>
          <span class="insight-value ${conditionsClass[insights.planting_conditions] || ''}">
            ${insights.planting_conditions.toUpperCase()}
          </span>
        </div>
        <div class="insight-item">
          <span class="insight-label">Harvest Conditions:</span>
          <span class="insight-value ${conditionsClass[insights.harvest_conditions] || ''}">
            ${insights.harvest_conditions.toUpperCase()}
          </span>
        </div>
        <div class="insight-item">
          <span class="insight-label">Irrigation:</span>
          <span class="insight-value ${insights.irrigation_needed ? 'insight-warning' : 'insight-good'}">
            ${insights.irrigation_needed ? 'NEEDED' : 'NOT NEEDED'}
          </span>
        </div>
      </div>
      ${insights.recommendations.length > 0 ? `
        <div class="insight-recommendations">
          <h4>Recommendations:</h4>
          <ul>
            ${insights.recommendations.map(rec => `<li>${rec}</li>`).join('')}
          </ul>
        </div>
      ` : ''}
    `;
  }

  async loadForecast() {
    try {
      const response = await fetch(`/api/weather/forecast?lat=${this.currentLat}&lon=${this.currentLon}&days=7`);
      
      if (!response.ok) {
        throw new Error('Failed to load forecast');
      }

      const data = await response.json();
      this.displayForecast(data);
    } catch (error) {
      console.error('Forecast load error:', error);
    }
  }

  displayForecast(data) {
    const container = document.getElementById('weather-forecast');
    const listDiv = document.getElementById('forecast-list');
    if (!container || !listDiv) return;

    // Cumulative GDD
    document.getElementById('cumulative-gdd').textContent = data.cumulative_gdd || 0;

    // Forecast items
    listDiv.innerHTML = data.forecast.map(day => {
      const date = new Date(day.date);
      const iconUrl = `https://openweathermap.org/img/wn/${day.icon}@2x.png`;
      
      return `
        <div class="forecast-item">
          <div class="forecast-date">
            <div class="forecast-day">${date.toLocaleDateString('en-US', { weekday: 'short' })}</div>
            <div class="forecast-date-num">${date.getDate()}/${date.getMonth() + 1}</div>
          </div>
          <div class="forecast-icon">
            <img src="${iconUrl}" alt="${day.description}">
          </div>
          <div class="forecast-temps">
            <span class="forecast-temp-high">${Math.round(day.temp_max)}°</span>
            <span class="forecast-temp-low">${Math.round(day.temp_min)}°</span>
          </div>
          <div class="forecast-details">
            <div class="forecast-detail">
              <span>💧</span>
              <span>${day.humidity_avg}%</span>
            </div>
            <div class="forecast-detail">
              <span>🌧️</span>
              <span>${day.rain.toFixed(1)}mm</span>
            </div>
            <div class="forecast-detail">
              <span>📊</span>
              <span>GDD: ${day.gdd}</span>
            </div>
          </div>
        </div>
      `;
    }).join('');

    container.classList.remove('hidden');
  }

  async calculateGDD() {
    if (!this.currentLat || !this.currentLon) {
      this.showError('Please select a location first');
      return;
    }

    const baseTemp = parseFloat(document.getElementById('gdd-base-temp').value);
    const days = parseInt(document.getElementById('gdd-days').value);

    if (isNaN(baseTemp) || isNaN(days)) {
      this.showError('Please enter valid values');
      return;
    }

    try {
      const response = await fetch(
        `/api/weather/gdd?lat=${this.currentLat}&lon=${this.currentLon}&days=${days}&base_temp=${baseTemp}`
      );

      if (!response.ok) {
        throw new Error('Failed to calculate GDD');
      }

      const data = await response.json();
      this.displayGDDResults(data);
    } catch (error) {
      this.showError('Error calculating GDD. Please try again.');
      console.error('GDD calculation error:', error);
    }
  }

  displayGDDResults(data) {
    const resultsDiv = document.getElementById('gdd-results');
    if (!resultsDiv) return;

    resultsDiv.innerHTML = `
      <div class="gdd-summary-result">
        <h4>GDD Summary</h4>
        <div class="gdd-summary-stats">
          <div class="gdd-stat">
            <span class="gdd-stat-label">Base Temperature:</span>
            <span class="gdd-stat-value">${data.base_temp}°C</span>
          </div>
          <div class="gdd-stat">
            <span class="gdd-stat-label">Period:</span>
            <span class="gdd-stat-value">${data.period_days} days</span>
          </div>
          <div class="gdd-stat">
            <span class="gdd-stat-label">Total GDD:</span>
            <span class="gdd-stat-value highlight">${data.total_gdd}</span>
          </div>
        </div>
      </div>
      <div class="gdd-daily-results">
        <h4>Daily GDD Breakdown</h4>
        <table class="gdd-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Min Temp</th>
              <th>Max Temp</th>
              <th>Daily GDD</th>
              <th>Cumulative</th>
            </tr>
          </thead>
          <tbody>
            ${data.daily_gdd.map(day => `
              <tr>
                <td>${new Date(day.date).toLocaleDateString()}</td>
                <td>${day.temp_min}°C</td>
                <td>${day.temp_max}°C</td>
                <td>${day.gdd}</td>
                <td>${day.cumulative_gdd}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;

    resultsDiv.classList.remove('hidden');
  }

  showError(message) {
    // Simple error display - can be enhanced with a toast notification
    alert(message);
  }
}

// Initialize weather manager
let weatherManager;
document.addEventListener('DOMContentLoaded', () => {
  weatherManager = new WeatherManager();
});

