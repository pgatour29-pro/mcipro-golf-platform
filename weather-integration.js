/**
 * WEATHER INTEGRATION SYSTEM
 * Fetches and displays weather data from OpenWeatherMap API
 * Provides course impact analysis and playability status
 */

const WeatherIntegration = {

    // Configuration
    config: {
        apiKey: '', // Will be set from course settings or environment
        latitude: 12.9236, // Bang Lamung, Chon Buri, Thailand (default)
        longitude: 100.8824,
        units: 'metric',
        updateInterval: 600000, // 10 minutes
        useDemo: false // Set to true to use demo data without API key
    },

    // State
    state: {
        currentWeather: null,
        forecast: null,
        alerts: [],
        lastUpdated: null,
        history: []
    },

    STORAGE_KEY: 'mcipro_weather_data',

    // ============================================
    // INITIALIZATION
    // ============================================

    init() {
        console.log('[WeatherIntegration] Initializing...');

        // Try to load API key from course settings
        this.loadAPIKey();

        // Load cached data
        this.loadFromStorage();

        // Fetch fresh weather data
        this.fetchWeatherData();

        // Set up auto-refresh
        this.startAutoRefresh();
    },

    loadAPIKey() {
        try {
            const courseSettings = JSON.parse(localStorage.getItem('golf_course_settings') || '{}');
            if (courseSettings.weatherAPIKey) {
                this.config.apiKey = courseSettings.weatherAPIKey;
                this.config.useDemo = false;
            } else {
                console.log('[WeatherIntegration] No API key found, using demo mode');
                this.config.useDemo = true;
            }
        } catch (error) {
            console.error('[WeatherIntegration] Error loading API key:', error);
            this.config.useDemo = true;
        }
    },

    loadFromStorage() {
        try {
            const saved = localStorage.getItem(this.STORAGE_KEY);
            if (saved) {
                const data = JSON.parse(saved);
                this.state.currentWeather = data.currentWeather;
                this.state.forecast = data.forecast;
                this.state.lastUpdated = data.lastUpdated;

                // Only use cached data if less than 30 minutes old
                const cacheAge = Date.now() - new Date(this.state.lastUpdated).getTime();
                if (cacheAge > 1800000) {
                    console.log('[WeatherIntegration] Cache expired, will fetch fresh data');
                }
            }
        } catch (error) {
            console.error('[WeatherIntegration] Error loading from storage:', error);
        }
    },

    saveToStorage() {
        try {
            const data = {
                currentWeather: this.state.currentWeather,
                forecast: this.state.forecast,
                lastUpdated: this.state.lastUpdated
            };
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
        } catch (error) {
            console.error('[WeatherIntegration] Error saving to storage:', error);
        }
    },

    startAutoRefresh() {
        setInterval(() => {
            this.fetchWeatherData();
        }, this.config.updateInterval);
    },

    // ============================================
    // WEATHER DATA FETCHING
    // ============================================

    async fetchWeatherData() {
        if (this.config.useDemo) {
            this.useDemoData();
            this.renderWeatherDashboard();
            return;
        }

        try {
            console.log('[WeatherIntegration] Fetching weather data...');

            // Fetch current weather
            const currentUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${this.config.latitude}&lon=${this.config.longitude}&appid=${this.config.apiKey}&units=${this.config.units}`;
            const currentResponse = await fetch(currentUrl);

            if (!currentResponse.ok) {
                throw new Error(`Weather API error: ${currentResponse.status}`);
            }

            const currentData = await currentResponse.json();

            // Fetch 5-day forecast
            const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${this.config.latitude}&lon=${this.config.longitude}&appid=${this.config.apiKey}&units=${this.config.units}`;
            const forecastResponse = await fetch(forecastUrl);

            if (!forecastResponse.ok) {
                throw new Error(`Forecast API error: ${forecastResponse.status}`);
            }

            const forecastData = await forecastResponse.json();

            // Process and store data
            this.state.currentWeather = this.processCurrentWeather(currentData);
            this.state.forecast = this.processForecast(forecastData);
            this.state.lastUpdated = new Date().toISOString();

            this.saveToStorage();
            this.renderWeatherDashboard();

            console.log('[WeatherIntegration] Weather data updated successfully');

        } catch (error) {
            console.error('[WeatherIntegration] Error fetching weather:', error);

            // Fallback to demo data if API fails
            if (!this.state.currentWeather) {
                this.useDemoData();
            }

            this.renderWeatherDashboard();
        }
    },

    processCurrentWeather(data) {
        return {
            temperature: Math.round(data.main.temp),
            feelsLike: Math.round(data.main.feels_like),
            humidity: data.main.humidity,
            pressure: data.main.pressure,
            windSpeed: Math.round(data.wind.speed * 3.6), // Convert m/s to km/h
            windDirection: data.wind.deg,
            visibility: Math.round(data.visibility / 1000), // Convert to km
            cloudiness: data.clouds.all,
            condition: data.weather[0].main.toLowerCase(),
            description: data.weather[0].description,
            icon: data.weather[0].icon,
            sunrise: new Date(data.sys.sunrise * 1000),
            sunset: new Date(data.sys.sunset * 1000),
            location: data.name
        };
    },

    processForecast(data) {
        // Get next 4 periods (3-hour intervals)
        const periods = data.list.slice(0, 4).map(period => ({
            time: new Date(period.dt * 1000),
            temperature: Math.round(period.main.temp),
            condition: period.weather[0].main.toLowerCase(),
            description: period.weather[0].description,
            icon: period.weather[0].icon,
            precipitation: period.pop * 100, // Probability of precipitation
            windSpeed: Math.round(period.wind.speed * 3.6)
        }));

        return periods;
    },

    useDemoData() {
        console.log('[WeatherIntegration] Using demo weather data');

        // Realistic tropical Thailand weather
        this.state.currentWeather = {
            temperature: 30,
            feelsLike: 34,
            humidity: 75,
            pressure: 1012,
            windSpeed: 12,
            windDirection: 135,
            visibility: 10,
            cloudiness: 40,
            condition: 'clouds',
            description: 'Scattered clouds with high humidity',
            icon: '02d',
            sunrise: new Date(),
            sunset: new Date(),
            location: 'Bang Lamung, Chon Buri'
        };

        // Set sunrise/sunset to realistic times
        this.state.currentWeather.sunrise.setHours(6, 15, 0);
        this.state.currentWeather.sunset.setHours(18, 30, 0);

        // Demo forecast
        this.state.forecast = [
            { time: new Date(Date.now() + 10800000), temperature: 31, condition: 'clouds', description: 'Partly cloudy', icon: '02d', precipitation: 20, windSpeed: 10 },
            { time: new Date(Date.now() + 21600000), temperature: 29, condition: 'clouds', description: 'Mostly cloudy', icon: '03d', precipitation: 30, windSpeed: 15 },
            { time: new Date(Date.now() + 32400000), temperature: 27, condition: 'rain', description: 'Light rain', icon: '10n', precipitation: 60, windSpeed: 18 },
            { time: new Date(Date.now() + 43200000), temperature: 26, condition: 'rain', description: 'Moderate rain', icon: '10n', precipitation: 80, windSpeed: 20 }
        ];

        this.state.lastUpdated = new Date().toISOString();
        this.saveToStorage();
    },

    // ============================================
    // DASHBOARD RENDERING
    // ============================================

    renderWeatherDashboard() {
        this.renderCurrentWeather();
        this.renderForecast();
        this.renderAlerts();
        this.renderCourseImpact();
        this.renderPlayabilityStatus();

        // Sync with maintenance tab if available
        if (typeof MaintenanceManagement !== 'undefined') {
            MaintenanceManagement.syncWithWeather();
        }
    },

    renderCurrentWeather() {
        const weather = this.state.currentWeather;
        if (!weather) return;

        // Weather tab display
        const tempEl = document.getElementById('weather-current-temp');
        const descEl = document.getElementById('weather-current-desc');
        const humidityEl = document.getElementById('weather-humidity');
        const windEl = document.getElementById('weather-wind');
        const pressureEl = document.getElementById('weather-pressure');
        const visibilityEl = document.getElementById('weather-visibility');
        const locationEl = document.getElementById('weather-location');
        const updatedEl = document.getElementById('weather-updated');

        if (tempEl) tempEl.textContent = `${weather.temperature}°C`;
        if (descEl) descEl.textContent = weather.description;
        if (humidityEl) humidityEl.textContent = `${weather.humidity}%`;
        if (windEl) windEl.textContent = `${weather.windSpeed} km/h`;
        if (pressureEl) pressureEl.textContent = `${weather.pressure} hPa`;
        if (visibilityEl) visibilityEl.textContent = `${weather.visibility} km`;
        if (locationEl) locationEl.textContent = weather.location;
        if (updatedEl) {
            const updateTime = new Date(this.state.lastUpdated);
            updatedEl.textContent = `Updated: ${updateTime.toLocaleTimeString()}`;
        }
    },

    renderForecast() {
        const container = document.getElementById('weather-forecast-3h');
        if (!container || !this.state.forecast) return;

        container.innerHTML = this.state.forecast.map(period => {
            const time = period.time.toLocaleTimeString('en-US', { hour: 'numeric' });

            return `
                <div class="text-center p-2 bg-gray-50 rounded border border-gray-100">
                    <div class="text-xs text-gray-500 mb-1">${time}</div>
                    <div class="text-xl mb-1">${this.getWeatherEmoji(period.condition)}</div>
                    <div class="text-sm font-semibold text-gray-900">${period.temperature}°</div>
                    ${period.precipitation > 30 ? `<div class="text-xs text-blue-600 mt-1">${period.precipitation}%</div>` : ''}
                </div>
            `;
        }).join('');
    },

    renderAlerts() {
        const container = document.getElementById('weather-alerts-container');
        if (!container) return;

        const alerts = this.generateWeatherAlerts();

        if (alerts.length === 0) {
            container.innerHTML = `<div class="text-xs text-gray-500">No alerts</div>`;
            return;
        }

        container.innerHTML = alerts.map(alert => {
            const color = alert.severity === 'high' ? 'red' : alert.severity === 'medium' ? 'yellow' : 'blue';
            return `
                <div class="flex items-start gap-2 p-2 bg-${color}-50 rounded text-xs border border-${color}-200">
                    <span class="material-symbols-outlined text-sm text-${color}-600">${alert.icon}</span>
                    <div class="flex-1">
                        <div class="font-semibold text-${color}-900">${alert.title}</div>
                        <div class="text-${color}-700 mt-0.5">${alert.message}</div>
                    </div>
                </div>
            `;
        }).join('');
    },

    generateWeatherAlerts() {
        const alerts = [];
        const weather = this.state.currentWeather;

        if (!weather) return alerts;

        // High temperature alert
        if (weather.temperature > 35) {
            alerts.push({
                severity: 'high',
                icon: 'thermostat',
                title: 'Extreme Heat Warning',
                message: 'Temperature exceeds 35°C. Limit outdoor activities and ensure hydration.'
            });
        } else if (weather.temperature > 32) {
            alerts.push({
                severity: 'medium',
                icon: 'wb_sunny',
                title: 'High Temperature',
                message: 'Hot conditions. Take precautions for staff and golfers.'
            });
        }

        // Rain alert
        if (weather.condition === 'rain' || (this.state.forecast && this.state.forecast[0].precipitation > 70)) {
            alerts.push({
                severity: 'medium',
                icon: 'rainy',
                title: 'Rain Expected',
                message: 'Precipitation likely. Monitor course conditions and adjust operations.'
            });
        }

        // Wind alert
        if (weather.windSpeed > 25) {
            alerts.push({
                severity: 'high',
                icon: 'air',
                title: 'Strong Wind Warning',
                message: 'Wind speeds exceed 25 km/h. Hazardous for some maintenance activities.'
            });
        } else if (weather.windSpeed > 20) {
            alerts.push({
                severity: 'medium',
                icon: 'air',
                title: 'Moderate Wind',
                message: 'Elevated wind speeds. Monitor flagsticks and outdoor equipment.'
            });
        }

        // Humidity alert
        if (weather.humidity > 90) {
            alerts.push({
                severity: 'medium',
                icon: 'water_drop',
                title: 'Very High Humidity',
                message: 'Humidity above 90%. Monitor for heat stress and turf disease.'
            });
        }

        return alerts;
    },

    renderCourseImpact() {
        const container = document.getElementById('weather-course-impact');
        if (!container) return;

        const impacts = this.calculateCourseImpact();

        container.innerHTML = impacts.map(impact => `
            <div class="flex items-center justify-between p-2 bg-gray-50 rounded text-xs border border-gray-100">
                <div class="flex items-center gap-2">
                    <span class="material-symbols-outlined text-sm text-${impact.statusColor}-600">${impact.icon}</span>
                    <span class="font-medium text-gray-700">${impact.area}</span>
                </div>
                <span class="px-2 py-0.5 bg-${impact.statusColor}-100 text-${impact.statusColor}-800 rounded-full font-medium">
                    ${impact.status}
                </span>
            </div>
        `).join('');
    },

    calculateCourseImpact() {
        const weather = this.state.currentWeather;
        if (!weather) return [];

        const impacts = [];

        // Greens impact
        if (weather.condition === 'rain') {
            impacts.push({
                area: 'Greens',
                icon: 'golf_course',
                impact: 'Soft and receptive. Monitor for excess moisture.',
                status: 'Fair',
                color: 'blue',
                statusColor: 'yellow'
            });
        } else if (weather.temperature > 32) {
            impacts.push({
                area: 'Greens',
                icon: 'golf_course',
                impact: 'Dry and fast. Increase watering schedule.',
                status: 'Good',
                color: 'green',
                statusColor: 'green'
            });
        } else {
            impacts.push({
                area: 'Greens',
                icon: 'golf_course',
                impact: 'Optimal conditions for play.',
                status: 'Excellent',
                color: 'green',
                statusColor: 'green'
            });
        }

        // Fairways impact
        if (weather.humidity > 80) {
            impacts.push({
                area: 'Fairways',
                icon: 'landscape',
                impact: 'High moisture. Watch for disease pressure.',
                status: 'Fair',
                color: 'blue',
                statusColor: 'yellow'
            });
        } else {
            impacts.push({
                area: 'Fairways',
                icon: 'landscape',
                impact: 'Good playing conditions.',
                status: 'Good',
                color: 'green',
                statusColor: 'green'
            });
        }

        // Cart paths impact
        if (weather.condition === 'rain') {
            impacts.push({
                area: 'Cart Paths',
                icon: 'route',
                impact: 'May be slippery. Advise caution.',
                status: 'Fair',
                color: 'yellow',
                statusColor: 'yellow'
            });
        } else {
            impacts.push({
                area: 'Cart Paths',
                icon: 'route',
                impact: 'Safe for cart traffic.',
                status: 'Excellent',
                color: 'green',
                statusColor: 'green'
            });
        }

        return impacts;
    },

    renderPlayabilityStatus() {
        const container = document.getElementById('weather-playability-status');
        if (!container) return;

        const playability = this.calculatePlayability();

        container.innerHTML = `
            <div class="flex items-center gap-4 mb-3 p-3 bg-${playability.overallColor}-50 rounded border border-${playability.overallColor}-200">
                <div class="text-2xl">${playability.emoji}</div>
                <div class="flex-1">
                    <div class="font-bold text-${playability.overallColor}-900 text-sm">${playability.status}</div>
                    <div class="text-xs text-gray-600 mt-0.5">${playability.message}</div>
                </div>
            </div>
            <div class="grid grid-cols-2 md:grid-cols-3 gap-2">
                ${playability.factors.map(factor => `
                    <div class="flex justify-between items-center p-2 bg-gray-50 rounded border border-gray-100 text-xs">
                        <span class="text-gray-600">${factor.name}</span>
                        <span class="px-2 py-0.5 bg-${factor.color}-100 text-${factor.color}-800 rounded-full font-medium">
                            ${factor.rating}
                        </span>
                    </div>
                `).join('')}
            </div>
        `;
    },

    calculatePlayability() {
        const weather = this.state.currentWeather;
        if (!weather) {
            return {
                status: 'Unknown',
                overallColor: 'gray',
                emoji: '❓',
                message: 'Weather data not available',
                factors: [],
                recommendations: []
            };
        }

        const factors = [];
        let overallScore = 0;

        // Temperature factor
        if (weather.temperature >= 20 && weather.temperature <= 30) {
            factors.push({ name: 'Temperature', rating: 'Ideal', color: 'green' });
            overallScore += 3;
        } else if (weather.temperature > 30 && weather.temperature <= 35) {
            factors.push({ name: 'Temperature', rating: 'Warm', color: 'yellow' });
            overallScore += 2;
        } else if (weather.temperature > 35) {
            factors.push({ name: 'Temperature', rating: 'Hot', color: 'red' });
            overallScore += 1;
        } else {
            factors.push({ name: 'Temperature', rating: 'Cool', color: 'blue' });
            overallScore += 2;
        }

        // Precipitation factor
        if (weather.condition === 'rain') {
            factors.push({ name: 'Precipitation', rating: 'Rainy', color: 'red' });
            overallScore += 1;
        } else if (weather.condition === 'drizzle') {
            factors.push({ name: 'Precipitation', rating: 'Light Rain', color: 'yellow' });
            overallScore += 2;
        } else {
            factors.push({ name: 'Precipitation', rating: 'Dry', color: 'green' });
            overallScore += 3;
        }

        // Wind factor
        if (weather.windSpeed <= 15) {
            factors.push({ name: 'Wind', rating: 'Calm', color: 'green' });
            overallScore += 3;
        } else if (weather.windSpeed <= 25) {
            factors.push({ name: 'Wind', rating: 'Breezy', color: 'yellow' });
            overallScore += 2;
        } else {
            factors.push({ name: 'Wind', rating: 'Windy', color: 'red' });
            overallScore += 1;
        }

        // Overall playability
        const avgScore = overallScore / 3;
        let status, overallColor, emoji, message;
        const recommendations = [];

        if (avgScore >= 2.5) {
            status = 'Excellent Playing Conditions';
            overallColor = 'green';
            emoji = '⛳';
            message = 'Perfect day for golf! All facilities operating normally.';
            recommendations.push('Course is in optimal condition');
            recommendations.push('All tee times proceeding as scheduled');
        } else if (avgScore >= 2) {
            status = 'Good Playing Conditions';
            overallColor = 'blue';
            emoji = '🏌️';
            message = 'Good conditions for play with minor weather factors.';
            recommendations.push('Monitor weather throughout the day');
            if (weather.temperature > 30) recommendations.push('Ensure water stations are stocked');
            if (weather.windSpeed > 15) recommendations.push('Secure loose items on course');
        } else if (avgScore >= 1.5) {
            status = 'Fair Conditions - Caution Advised';
            overallColor = 'yellow';
            emoji = '⚠️';
            message = 'Playable but challenging conditions. Monitor closely.';
            recommendations.push('Inform golfers of weather conditions');
            recommendations.push('Have contingency plans ready');
            if (weather.condition === 'rain') recommendations.push('Monitor course drainage');
        } else {
            status = 'Poor Conditions - Play at Risk';
            overallColor = 'red';
            emoji = '🚨';
            message = 'Severe weather impacting playability. Consider delays or closure.';
            recommendations.push('Consider suspending play');
            recommendations.push('Alert all golfers and staff');
            recommendations.push('Monitor for lightning and severe weather');
        }

        return { status, overallColor, emoji, message, factors, recommendations };
    },

    // ============================================
    // PUBLIC API
    // ============================================

    getCurrentWeather() {
        return this.state.currentWeather;
    },

    getForecast() {
        return this.state.forecast;
    },

    getAlerts() {
        return this.generateWeatherAlerts();
    },

    // ============================================
    // UTILITY FUNCTIONS
    // ============================================

    getWeatherEmoji(condition) {
        const emojis = {
            'clear': '☀️',
            'clouds': '☁️',
            'rain': '🌧️',
            'drizzle': '🌦️',
            'thunderstorm': '⛈️',
            'snow': '❄️',
            'mist': '🌫️',
            'fog': '🌫️'
        };
        return emojis[condition] || '🌤️';
    }
};

// Export to window
window.WeatherIntegration = WeatherIntegration;

console.log('[WeatherIntegration] Module loaded');
