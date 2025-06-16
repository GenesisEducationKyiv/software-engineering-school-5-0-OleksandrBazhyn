import { WeatherData } from "../types.js";

class WeatherManager {
  private WEATHER_API_KEY: string | undefined;
  private weatherData: WeatherData | null;

  constructor() {
    this.WEATHER_API_KEY = process.env.WEATHER_API_KEY;
    this.weatherData = null;
  }

  async fetchWeatherData(location: string): Promise<WeatherData> {
    if (!this.WEATHER_API_KEY) {
      throw new Error("WEATHER_API_KEY is not set in environment variables.");
    }
    try {
      const response = await fetch(
        `https://api.weatherapi.com/v1/current.json?key=${this.WEATHER_API_KEY}&q=${encodeURIComponent(location)}`,
      );
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      const data: WeatherData = await response.json();
      this.weatherData = data;
      return data;
    } catch (error) {
      console.error("Error fetching weather data:", error);
      throw new Error("Failed to fetch weather data");
    }
  }

  getWeatherData(): WeatherData | null {
    return this.weatherData;
  }
}

export default WeatherManager;
