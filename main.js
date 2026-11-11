// Weather data from Open-Meteo (free, no API key required)
// WMO weather codes mapped to descriptions and icons

const WEATHER_CODES = {
    0: { description: "Clear sky", icon: "☀️" },
    1: { description: "Mainly clear", icon: "🌤️" },
    2: { description: "Partly cloudy", icon: "⛅" },
    3: { description: "Overcast", icon: "☁️" },
    45: { description: "Fog", icon: "🌫️" },
    48: { description: "Rime fog", icon: "🌫️" },
    51: { description: "Light drizzle", icon: "🌦️" },
    53: { description: "Moderate drizzle", icon: "🌦️" },
    55: { description: "Dense drizzle", icon: "🌦️" },
    56: { description: "Freezing drizzle", icon: "🌧️" },
    57: { description: "Dense freezing drizzle", icon: "🌧️" },
    61: { description: "Slight rain", icon: "🌦️" },
    63: { description: "Moderate rain", icon: "🌧️" },
    65: { description: "Heavy rain", icon: "🌧️" },
    66: { description: "Freezing rain", icon: "🌧️" },
    67: { description: "Heavy freezing rain", icon: "🌧️" },
    71: { description: "Slight snowfall", icon: "🌨️" },
    73: { description: "Moderate snowfall", icon: "🌨️" },
    75: { description: "Heavy snowfall", icon: "❄️" },
    77: { description: "Snow grains", icon: "❄️" },
    80: { description: "Slight rain showers", icon: "🌦️" },
    81: { description: "Moderate rain showers", icon: "🌧️" },
    82: { description: "Violent rain showers", icon: "⛈️" },
    85: { description: "Slight snow showers", icon: "🌨️" },
    86: { description: "Heavy snow showers", icon: "❄️" },
    95: { description: "Thunderstorm", icon: "⛈️" },
    96: { description: "Thunderstorm with hail", icon: "⛈️" },
    99: { description: "Thunderstorm with heavy hail", icon: "⛈️" }
};

const cityInput = document.getElementById("city");
const loadingEl = document.getElementById("loading");
const errorEl = document.getElementById("error-message");
const weatherContainer = document.querySelector(".weather-container");

function getWeatherInfo(code) {
    return WEATHER_CODES[code] || { description: "Unknown", icon: "🌡️" };
}

function setLoading(visible) {
    loadingEl.style.display = visible ? "block" : "none";
}

function showError(message) {
    errorEl.textContent = message;
    errorEl.style.display = "block";
}

function hideError() {
    errorEl.style.display = "none";
}

async function fetchWeather(latitude, longitude, locationName) {
    setLoading(true);
    hideError();
    weatherContainer.style.display = "none";
    try {
        const url =
            "https://api.open-meteo.com/v1/forecast" +
            "?latitude=" + latitude + "&longitude=" + longitude +
            "&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m" +
            "&daily=weather_code,temperature_2m_max,temperature_2m_min" +
            "&timezone=auto&forecast_days=7";
        const response = await fetch(url);
        if (!response.ok) throw new Error("Failed to fetch weather data. Please try again.");
        const data = await response.json();
        displayWeather(data, locationName);
    } catch (error) {
        showError(error.message || "Something went wrong. Please try again.");
    } finally {
        setLoading(false);
    }
}

function displayWeather(data, locationName) {
    const current = data.current;
    const info = getWeatherInfo(current.weather_code);

    document.getElementById("cityName").textContent = locationName;
    document.getElementById("temperature").textContent = Math.round(current.temperature_2m) + "°C";
    document.getElementById("description").textContent = info.icon + " " + info.description;
    document.getElementById("feel-like").textContent = "Feels like: " + Math.round(current.apparent_temperature) + "°C";
    document.getElementById("humidity").textContent = "Humidity: " + current.relative_humidity_2m + "%";
    document.getElementById("wind").textContent = "Wind: " + Math.round(current.wind_speed_10m) + " km/h";
    document.querySelector(".current-weather .icon").textContent = info.icon;

    const dayEls = document.querySelectorAll(".forecast .day");
    const daily = data.daily;
    dayEls.forEach(function (dayEl, i) {
        const dayIndex = i + 1; // skip today (index 0)
        if (dayIndex >= daily.time.length) {
            dayEl.style.display = "none";
            return;
        }
        const dayInfo = getWeatherInfo(daily.weather_code[dayIndex]);
        const date = new Date(daily.time[dayIndex] + "T12:00:00");
        dayEl.querySelector(".weekday").textContent = date.toLocaleDateString("en-US", { weekday: "short" });
        dayEl.querySelector(".icon").textContent = dayInfo.icon;
        dayEl.querySelector(".temp").textContent =
            Math.round(daily.temperature_2m_max[dayIndex]) + "° / " +
            Math.round(daily.temperature_2m_min[dayIndex]) + "°";
        dayEl.style.display = "flex";
    });

    weatherContainer.style.display = "block";
}

async function getWeather() {
    const cityName = cityInput.value.trim();
    if (!cityName) {
        showError("Please enter a city name.");
        return;
    }
    setLoading(true);
    hideError();
    try {
        const response = await fetch(
            "https://geocoding-api.open-meteo.com/v1/search?name=" +
            encodeURIComponent(cityName) + "&count=1&language=en&format=json"
        );
        if (!response.ok) throw new Error("Failed to search for the city. Please try again.");
        const data = await response.json();
        if (!data.results || data.results.length === 0) {
            throw new Error('City "' + cityName + '" not found. Please check the spelling.');
        }
        const result = data.results[0];
        const label = result.name + (result.country ? ", " + result.country : "");
        await fetchWeather(result.latitude, result.longitude, label);
    } catch (error) {
        setLoading(false);
        showError(error.message || "Something went wrong. Please try again.");
    }
}

function handleEnter(event) {
    if (event.key === "Enter") getWeather();
}

function getLocation() {
    if (!navigator.geolocation) {
        showError("Geolocation is not supported by your browser. Please search for your city instead.");
        return;
    }
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
        async function (position) {
            const latitude = position.coords.latitude;
            const longitude = position.coords.longitude;
            let locationName = "Your location";
            try {
                const response = await fetch(
                    "https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=" +
                    latitude + "&longitude=" + longitude + "&localityLanguage=en"
                );
                const place = await response.json();
                locationName = place.city || place.locality || place.principalSubdivision || locationName;
                if (place.countryName) locationName += ", " + place.countryName;
            } catch (error) {
                // keep default label if reverse geocoding fails
            }
            await fetchWeather(latitude, longitude, locationName);
        },
        function (error) {
            setLoading(false);
            if (error.code === error.PERMISSION_DENIED) {
                showError("Location access was denied. Please allow location access or search for your city above.");
            } else {
                showError("Unable to get your location. Please search for your city above.");
            }
        },
        { timeout: 10000, maximumAge: 600000 }
    );
}

// Show the user's current weather and location when the app opens
getLocation();
