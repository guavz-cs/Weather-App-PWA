const weatherList = [];
let deferredPrompt;


if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        const swCode = `
            const CACHE_NAME = 'weather-app-v1';
            const urlsToCache = ['/'];
            
            self.addEventListener('install', event => {
                event.waitUntil(
                    caches.open(CACHE_NAME)
                        .then(cache => cache.addAll(urlsToCache))
                );
            });
            
            self.addEventListener('fetch', event => {
                event.respondWith(
                    caches.match(event.request)
                        .then(response => response || fetch(event.request))
                );
            });
        `;
        
        const blob = new Blob([swCode], { type: 'application/javascript' });
        const swUrl = URL.createObjectURL(blob);
        
        navigator.serviceWorker.register(swUrl);
    });
}

// Install
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    document.getElementById('installPrompt').classList.add('show');
});

document.getElementById('installBtn').addEventListener('click', async () => {
    if (deferredPrompt) {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        deferredPrompt = null;
        document.getElementById('installPrompt').classList.remove('show');
    }
});


async function getCurrentWeather(city) {
    const response = await fetch(`/api/weather?city=${city}&type=current`);
    if (!response.ok) throw new Error('City not found');
    return response.json();
}

async function getCurrentWeatherByCoords(lat, lon) {
    const response = await fetch(`/api/weather?lat=${lat}&lon=${lon}&type=current`);
    if (!response.ok) throw new Error('Weather data not available');
    return response.json();
}

async function getForecast(city) {
    const response = await fetch(`/api/weather?city=${city}&type=forecast`);
    if (!response.ok) throw new Error('Forecast not available');
    return response.json();
}

async function getForecastByCoords(lat, lon) {
    const response = await fetch(`/api/weather?lat=${lat}&lon=${lon}&type=forecast`);
    if (!response.ok) throw new Error('Forecast not available');
    return response.json();
}


function formatTime(timestamp) {
    return new Date(timestamp * 1000).toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false 
    });
}

function formatDate(timestamp) {
    return new Date(timestamp * 1000).toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function capitalizeFirst(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

function calculateHighLow(forecastList) {
    if (!forecastList || forecastList.length === 0) {
        return { high: 0, low: 0 };
    }

    const today = forecastList.slice(0, Math.min(8, forecastList.length));
    let high = -Infinity;
    let low = Infinity;

    today.forEach(item => {
        if (item.main.temp_max > high) high = item.main.temp_max;
        if (item.main.temp_min < low) low = item.main.temp_min;
    });

    return { high, low };
}

function createWeatherCard(weather) {
    const { high, low } = calculateHighLow(weather.list);
    
    return `
        <div class="weather-card" onclick="showDetail(${weatherList.indexOf(weather)})">
            <div class="card-top">
                <div class="city-info">
                    <h2>${weather.name}</h2>
                    <div class="time">${formatTime(weather.dt)}</div>
                </div>
                <div class="temp-main">${Math.round(weather.main.temp)}°</div>
            </div>
            <div class="card-divider"></div>
            <div class="card-bottom">
                <div>
                    <div class="weather-desc">${capitalizeFirst(weather.weather[0].description)}</div>
                    <div class="detail-hint">Click for details</div>
                </div>
                <div class="temp-range">
                    <div class="temp-item high">
                        <span>H</span>
                        <div class="value">${Math.round(high || weather.main.temp_max)}°</div>
                    </div>
                    <div class="temp-item low">
                        <span>L</span>
                        <div class="value">${Math.round(low || weather.main.temp_min)}°</div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function renderWeatherList() {
    const container = document.getElementById('weatherList');
    container.innerHTML = weatherList.map(w => createWeatherCard(w)).join('');
}

async function addWeather(city) {
    try {
        showLoading(true);
        hideError();
        
        const current = await getCurrentWeather(city);
        const forecast = await getForecast(city);
        
        current.list = forecast.list;
        weatherList.unshift(current);
        
        renderWeatherList();
        showError(`Added ${current.name} - ${Math.round(current.main.temp)}°C`, false);
        setTimeout(hideError, 3000);
    } catch (error) {
        showError(error.message);
    } finally {
        showLoading(false);
    }
}

async function addWeatherByLocation(lat, lon) {
    try {
        showLoading(true);
        hideError();
        
        const current = await getCurrentWeatherByCoords(lat, lon);
        const forecast = await getForecastByCoords(lat, lon);
        
        current.list = forecast.list;
        weatherList.unshift(current);
        
        renderWeatherList();
        showError(`Added ${current.name} - ${Math.round(current.main.temp)}°C`, false);
        setTimeout(hideError, 3000);
    } catch (error) {
        showError(error.message);
        // Fallback to default city
        addWeather('Port Elizabeth');
    } finally {
        showLoading(false);
    }
}

function showDetail(index) {
    const weather = weatherList[index];
    
    document.getElementById('detailCity').textContent = weather.name;
    document.getElementById('detailTemp').textContent = `${Math.round(weather.main.temp)}°C`;
    document.getElementById('detailDesc').textContent = capitalizeFirst(weather.weather[0].description);
    document.getElementById('detailFeels').textContent = `Feels like ${Math.round(weather.main.feels_like)}°C`;
    
    document.getElementById('detailHumidity').textContent = `${weather.main.humidity}%`;
    document.getElementById('detailWind').textContent = `${weather.wind.speed.toFixed(2)} m/s`;
    document.getElementById('detailPressure').textContent = `${weather.main.pressure} hPa`;
    document.getElementById('detailVisibility').textContent = `${(weather.visibility / 1000).toFixed(1)} km`;
    document.getElementById('detailClouds').textContent = `${weather.clouds.all}%`;
    
    document.getElementById('detailSunrise').textContent = formatTime(weather.sys.sunrise);
    document.getElementById('detailSunset').textContent = formatTime(weather.sys.sunset);
    document.getElementById('detailUpdate').textContent = `Last updated: ${formatDate(weather.dt)}`;
    
    document.getElementById('detailView').classList.add('active');
}

function hideDetail() {
    document.getElementById('detailView').classList.remove('active');
}

function showLoading(show) {
    document.getElementById('loading').style.display = show ? 'block' : 'none';
}

function showError(message, isError = true) {
    const errorEl = document.getElementById('errorMsg');
    errorEl.textContent = message;
    errorEl.style.display = 'block';
    errorEl.style.background = isError ? '#ffebee' : '#e8f5e9';
    errorEl.style.color = isError ? '#c62828' : '#2e7d32';
}

function hideError() {
    document.getElementById('errorMsg').style.display = 'none';
}

// Event Listeners
document.getElementById('searchBtn').addEventListener('click', () => {
    const city = document.getElementById('searchInput').value.trim();
    if (city) {
        addWeather(city);
        document.getElementById('searchInput').value = '';
    } else {
        showError('Please enter a city name');
    }
});

document.getElementById('searchInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        document.getElementById('searchBtn').click();
    }
});

document.getElementById('locationBtn').addEventListener('click', () => {
    if ('geolocation' in navigator) {
        showLoading(true);
        navigator.geolocation.getCurrentPosition(
            (position) => {
                addWeatherByLocation(position.coords.latitude, position.coords.longitude);
            },
            (error) => {
                showError('Unable to get location. Using default city.');
                addWeather('Port Elizabeth');
            }
        );
    } else {
        showError('Geolocation not supported');
    }
});

document.getElementById('backBtn').addEventListener('click', hideDetail);


window.addEventListener('load', () => {
    if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                addWeatherByLocation(position.coords.latitude, position.coords.longitude);
            },
            () => {
                addWeather('Port Elizabeth');
            }
        );
    } else {
        addWeather('Port Elizabeth');
    }
});