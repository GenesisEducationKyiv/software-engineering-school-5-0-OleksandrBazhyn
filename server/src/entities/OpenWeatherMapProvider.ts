import { WeatherData, GeocodingResult } from "../types.js";
import { BaseWeatherProvider } from "./BaseWeatherProvider.js";
import { config } from "../config.js";

export class OpenWeatherMapProvider extends BaseWeatherProvider {
  private OPENWEATHERMAP_API_KEY: string | undefined;

  constructor() {
    super("OpenWeatherMap");
    this.OPENWEATHERMAP_API_KEY =
      process.env.OPENWEATHERMAP_API_KEY || config.OPENWEATHERMAP_API_KEY;

    if (!this.OPENWEATHERMAP_API_KEY || this.OPENWEATHERMAP_API_KEY === "") {
      console.warn("OPENWEATHERMAP_API_KEY is not set in environment variables.");
    }
  }

  protected async fetchWeatherData(city: string): Promise<WeatherData> {
    this.validateApiKey();

    const coordinates = await this.getCoordinatesForCity(city);
    const weatherData = await this.getWeatherByCoordinates(coordinates);

    return this.transformToWeatherData(weatherData);
  }

  private validateApiKey(): void {
    if (!this.OPENWEATHERMAP_API_KEY || this.OPENWEATHERMAP_API_KEY === "") {
      throw new Error("OPENWEATHERMAP_API_KEY is not set in environment variables.");
    }
  }

  private async getCoordinatesForCity(city: string): Promise<GeocodingResult> {
    const geoResponse = await fetch(
      `http://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(city)}&limit=1&appid=${this.OPENWEATHERMAP_API_KEY}`,
    );

    if (!geoResponse.ok) {
      throw new Error(`Geocoding API response was not ok: ${geoResponse.status}`);
    }

    const geoData = await geoResponse.json();
    if (!geoData || !geoData.length) {
      throw new Error(`City not found: ${city}`);
    }

    return { lat: geoData[0].lat, lon: geoData[0].lon };
  }

  private async getWeatherByCoordinates(coords: GeocodingResult): Promise<unknown> {
    const { lat, lon } = coords;

    const weatherResponse = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${this.OPENWEATHERMAP_API_KEY}&units=metric`,
    );

    if (!weatherResponse.ok) {
      throw new Error(`Weather API response was not ok: ${weatherResponse.status}`);
    }

    const data = await weatherResponse.json();
    this.validateWeatherData(data);

    return data;
  }

  private validateWeatherData(data: any): void {
    if (
      !data.main ||
      typeof data.main.temp !== "number" ||
      typeof data.main.humidity !== "number"
    ) {
      throw new Error("Invalid weather data format: missing required fields");
    }
  }

  private transformToWeatherData(data: any): WeatherData {
    return {
      current: {
        temp_c: data.main.temp,
        humidity: data.main.humidity,
        condition: {
          text: data.weather && data.weather.length > 0 ? data.weather[0].description : "Unknown",
        },
      },
    };
  }
}

export default OpenWeatherMapProvider;
