import { WeatherData } from "../types.js";
import { config } from "../config.js";
import { BaseWeatherProvider } from "./BaseWeatherProvider.js";

export class WeatherAPIProvider extends BaseWeatherProvider {
  private WEATHER_API_KEY: string | undefined;

  constructor() {
    super("WeatherAPI");
    this.WEATHER_API_KEY = config.WEATHER_API_KEY;

    if (!this.WEATHER_API_KEY || this.WEATHER_API_KEY === "") {
      console.warn("WEATHER_API_KEY is not set in environment variables.");
    }
  }

  protected async fetchWeatherData(location: string): Promise<WeatherData> {
    if (!this.WEATHER_API_KEY) {
      throw new Error("WEATHER_API_KEY is not set in environment variables.");
    }

    const response = await fetch(
      `https://api.weatherapi.com/v1/current.json?key=${this.WEATHER_API_KEY}&q=${encodeURIComponent(
        location,
      )}`,
    );

    if (!response.ok) {
      throw new Error(`Network response was not ok: ${response.status}`);
    }

    const data = await response.json();
    if (!data || !data.current) {
      throw new Error("Invalid weather data received");
    }

    return {
      current: {
        temp_c: data.current.temp_c,
        humidity: data.current.humidity,
        condition: {
          text: data.current.condition.text,
        },
      },
    };
  }
}

export default WeatherAPIProvider;
