import {
  WeatherData,
  GeocodingResult,
  OpenWeatherMapGeocodingResponse,
  OpenWeatherMapWeatherResponse,
} from "../types.js";
import { BaseWeatherProvider } from "./BaseWeatherProvider.js";
import { config } from "../config.js";
import { Logger } from "winston";

export class OpenWeatherMapProvider extends BaseWeatherProvider {
  private OPENWEATHERMAP_API_KEY: string;

  constructor(logger: Logger) {
    super("OpenWeatherMap", logger);
    this.OPENWEATHERMAP_API_KEY = config.OPENWEATHERMAP_API_KEY || "";

    if (!this.OPENWEATHERMAP_API_KEY) {
      this.logger.error("OPENWEATHERMAP_API_KEY is not set in environment variables.");
      throw new Error("OPENWEATHERMAP_API_KEY is not set in environment variables.");
    }
  }

  protected async fetchWeatherData(city: string): Promise<WeatherData> {
    const coordinates = await this.getCoordinatesForCity(city);
    const rawWeatherData = await this.fetchRawWeatherData(coordinates);
    this.validateWeatherData(rawWeatherData);

    return this.transformToWeatherData(rawWeatherData);
  }

  protected async getCoordinatesForCity(city: string): Promise<GeocodingResult> {
    const url = this.buildGeocodingUrl(city);
    const response = await this.makeApiRequest<OpenWeatherMapGeocodingResponse[]>(url);
    return this.parseGeocodingResponse(response, city);
  }

  protected buildGeocodingUrl(city: string): string {
    return `http://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(
      city,
    )}&limit=1&appid=${this.OPENWEATHERMAP_API_KEY}`;
  }

  protected async makeApiRequest<T>(url: string): Promise<T> {
    const response = await fetch(url);

    if (!response.ok) {
      this.logger.error("API request failed", { url, status: response.status });
      throw new Error(`API response was not ok: ${response.status}`);
    }

    const jsonData = await response.json();
    this.logger.debug("API request successful", jsonData);
    return jsonData;
  }

  protected parseGeocodingResponse(
    data: OpenWeatherMapGeocodingResponse[],
    city: string,
  ): GeocodingResult {
    this.logger.debug("Parsing geocoding response", { data, city });
    if (!data || !data.length) {
      this.logger.error("Geocoding API returned no results", { city });
      throw new Error(`City not found: ${city}`);
    }

    return { lat: data[0].lat, lon: data[0].lon };
  }

  protected async fetchRawWeatherData(
    coords: GeocodingResult,
  ): Promise<OpenWeatherMapWeatherResponse> {
    const url = this.buildWeatherUrl(coords);
    return this.makeApiRequest<OpenWeatherMapWeatherResponse>(url);
  }

  protected buildWeatherUrl(coords: GeocodingResult): string {
    return `https://api.openweathermap.org/data/2.5/weather?lat=${coords.lat}&lon=${coords.lon}&appid=${this.OPENWEATHERMAP_API_KEY}&units=metric`;
  }

  protected validateWeatherData(data: OpenWeatherMapWeatherResponse): void {
    const hasMain = !!data.main;
    const hasValidTemp = typeof data.main?.temp === "number";
    const hasValidHumidity = typeof data.main?.humidity === "number";

    if (!hasMain || !hasValidTemp || !hasValidHumidity) {
      this.logger.error("Invalid weather data format", { data });
      throw new Error("Invalid weather data format: missing required fields");
    }
  }

  protected transformToWeatherData(data: OpenWeatherMapWeatherResponse): WeatherData {
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
