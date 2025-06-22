import { WeatherData, GeocodingResult } from "../types.js";
import { BaseWeatherProvider } from "./BaseWeatherProvider.js";
import { config } from "../config.js";

export class OpenWeatherMapProvider extends BaseWeatherProvider {
  private apiKey: string;

  constructor(apiKey?: string) {
    super("OpenWeatherMap");
    this.apiKey =
      apiKey || process.env.OPENWEATHERMAP_API_KEY || config.OPENWEATHERMAP_API_KEY || "";

    if (!this.apiKey) {
      console.warn("OPENWEATHERMAP_API_KEY is not set in environment variables.");
    }
  }

  protected async fetchWeatherData(city: string): Promise<WeatherData> {
    this.validateApiKey();

    const coordinates = await this.getCoordinatesForCity(city);
    const rawWeatherData = await this.fetchRawWeatherData(coordinates);
    this.validateWeatherData(rawWeatherData);

    return this.transformToWeatherData(rawWeatherData);
  }

  private validateApiKey(): void {
    if (!this.apiKey) {
      throw new Error("OPENWEATHERMAP_API_KEY is not set in environment variables.");
    }
  }

  protected async getCoordinatesForCity(city: string): Promise<GeocodingResult> {
    const url = this.buildGeocodingUrl(city);
    const response = await this.makeApiRequest(url);
    return this.parseGeocodingResponse(response, city);
  }

  protected buildGeocodingUrl(city: string): string {
    return `http://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(
      city,
    )}&limit=1&appid=${this.apiKey}`;
  }

  protected async makeApiRequest(url: string): Promise<any> {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`API response was not ok: ${response.status}`);
    }

    return response.json();
  }

  protected parseGeocodingResponse(data: any, city: string): GeocodingResult {
    if (!data || !data.length) {
      throw new Error(`City not found: ${city}`);
    }

    return { lat: data[0].lat, lon: data[0].lon };
  }

  protected async fetchRawWeatherData(coords: GeocodingResult): Promise<any> {
    const url = this.buildWeatherUrl(coords);
    return this.makeApiRequest(url);
  }

  protected buildWeatherUrl(coords: GeocodingResult): string {
    return `https://api.openweathermap.org/data/2.5/weather?lat=${coords.lat}&lon=${coords.lon}&appid=${this.apiKey}&units=metric`;
  }

  protected validateWeatherData(data: any): void {
    if (
      !data.main ||
      typeof data.main.temp !== "number" ||
      typeof data.main.humidity !== "number"
    ) {
      throw new Error("Invalid weather data format: missing required fields");
    }
  }

  protected transformToWeatherData(data: any): WeatherData {
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
