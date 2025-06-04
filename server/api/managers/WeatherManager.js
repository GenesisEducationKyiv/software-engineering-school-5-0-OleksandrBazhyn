class WeatherManager {
    constructor() {
        this.WEATHER_API_KEY = process.env.WEATHER_API_KEY;
        this.weatherData = null;
    }

    async fetchWeatherData(location) {
        try {
            const response = await fetch(`https://api.weatherapi.com/v1/current.json?key=${this.WEATHER_API_KEY}&q=${location}`);
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            const data = await response.json();
            this.weatherData = data;
            return data;
        } catch (error) {
            console.error('Error fetching weather data:', error);
            throw new Error('Failed to fetch weather data');
        }
    }

    getWeatherData() {
        return this.weatherData;
    }
}

export default WeatherManager;