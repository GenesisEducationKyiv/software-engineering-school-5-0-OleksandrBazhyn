import { WeatherData, WeatherProvider } from "../types.js";
import { config } from "../config.js";
import { CityNotFound } from "../errors/SubscriptionError.js";

class WeatherAPIClient implements WeatherProvider {
  private WEATHER_API_KEY: string | undefined;

  constructor() {
    this.WEATHER_API_KEY = config.WEATHER_API_KEY;
    if (!this.WEATHER_API_KEY || this.WEATHER_API_KEY === "") {
      console.warn("WEATHER_API_KEY is not set in environment variables.");
    }
  }

  async getWeatherData(location: string): Promise<WeatherData> {
    if (!this.WEATHER_API_KEY) {
      throw new Error("WEATHER_API_KEY is not set in environment variables.");
    }

    try {
      const response = await fetch(
        `https://api.weatherapi.com/v1/current.json?key=${this.WEATHER_API_KEY}&q=${encodeURIComponent(
          location,
        )}`,
      );

      if (response.status === 404) {
        throw new CityNotFound();
      }

      if (!response.ok) {
        throw new Error("Network response was not ok");
      }

      const data: WeatherData = await response.json();
      if (!data || !data.current) {
        throw new Error("Invalid weather data received");
      }

      return data;
    } catch (error) {
      if (error instanceof CityNotFound) {
        throw error;
      }

      console.error("Error fetching weather data:", error);
      throw new Error("Failed to fetch weather data");
    }
  }
}

export default WeatherAPIClient;
