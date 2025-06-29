import { WeatherData, WeatherProvider } from "../types.js";
import { Logger } from "winston";

export abstract class BaseWeatherProvider implements WeatherProvider {
  protected nextProvider: WeatherProvider | null = null;
  protected name: string;
  protected logger: Logger;

  constructor(name: string, logger: Logger) {
    this.name = name;
    this.logger = logger;
  }

  setNext(provider: WeatherProvider): WeatherProvider {
    this.nextProvider = provider;
    return provider;
  }

  async getWeatherData(city: string): Promise<WeatherData> {
    try {
      const data = await this.fetchWeatherData(city);
      this.logger.info("Weather data fetched successfully", {
        provider: this.name,
        city,
        data,
      });
      return data;
    } catch (error) {
      this.logger.error("Error fetching weather data from provider", {
        provider: this.name,
        city,
        error,
      });

      if (this.nextProvider) {
        this.logger.info("Trying next provider", {
          currentProvider: this.name,
          nextProvider: this.nextProvider.constructor.name,
          city,
        });
        return this.nextProvider.getWeatherData(city);
      }
      throw new Error("Failed to fetch weather data for " + city + " from all providers");
    }
  }

  protected abstract fetchWeatherData(city: string): Promise<WeatherData>;
}
