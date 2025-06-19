import { WeatherData } from "../types.js";
import { config } from "../config.js";

class WeatherManager {
  private WEATHER_API_KEY: string | undefined;

  constructor() {
    if (!this.WEATHER_API_KEY) {
      console.warn("WEATHER_API_KEY is not set in environment variables.");
    }
    this.WEATHER_API_KEY = config.WEATHER_API_KEY;
  }

  async getWeatherData(location: string): Promise<WeatherData> {
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
      if (!data || !data.current) {
        throw new Error("Invalid weather data received");
      }
      return data;
    } catch (error) {
      console.error("Error fetching weather data:", error);
      throw new Error("Failed to fetch weather data");
    }
  }
}

export default WeatherManager;
