import { WeatherData } from "../types.js";
import { config } from "../config.js";
import { BaseWeatherProvider } from "./BaseWeatherProvider.js";
import { Logger } from "winston";

export class WeatherAPIProvider extends BaseWeatherProvider {
  private WEATHER_API_KEY: string | undefined;

  constructor(logger?: Logger) {
    super("WeatherAPI", logger);
    this.WEATHER_API_KEY = config.WEATHER_API_KEY;

    if (!this.WEATHER_API_KEY || this.WEATHER_API_KEY === "") {
      this.logger.error("WEATHER_API_KEY is not set in environment variables.");
      throw new Error("WEATHER_API_KEY is not set in environment variables.");
    }
  }

  protected async fetchWeatherData(location: string): Promise<WeatherData> {
    const response = await fetch(
      `https://api.weatherapi.com/v1/current.json?key=${this.WEATHER_API_KEY}&q=${encodeURIComponent(
        location,
      )}`,
    );

    if (!response.ok) {
      this.logger.error("WeatherAPI request failed", {
        url: response.url,
        status: response.status,
      });
      throw new Error(`Network response was not ok: ${response.status}`);
    }

    const data = await response.json();
    if (!data || !data.current) {
      this.logger.error("Invalid weather data received", { data });
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
