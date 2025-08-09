import { WeatherData, WeatherProvider } from "../../types.js";
import { Logger } from "winston";
import {
  weatherProviderRequestsTotal,
  weatherProviderResponseTime,
  errorRate,
} from "../../metrics/index.js";

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
    const startTime = Date.now();

    try {
      weatherProviderRequestsTotal.inc({ provider: this.name, status: "attempt" });

      const data = await this.fetchWeatherData(city);
      const duration = (Date.now() - startTime) / 1000;

      // Record successful metrics
      weatherProviderRequestsTotal.inc({ provider: this.name, status: "success" });
      weatherProviderResponseTime.observe({ provider: this.name }, duration);

      try {
        this.logger.info("Weather data fetched successfully", {
          provider: this.name,
          city,
          duration: duration * 1000, // Convert back to ms for logging
          data,
        });
      } catch (logError) {
        console.error("Logging error:", logError);
      }
      return data;
    } catch (error) {
      const duration = (Date.now() - startTime) / 1000;

      // Record failure metrics
      weatherProviderRequestsTotal.inc({ provider: this.name, status: "error" });
      weatherProviderResponseTime.observe({ provider: this.name }, duration);
      errorRate.inc({ type: "provider", service: this.name });

      try {
        this.logger.error("Error fetching weather data from provider", {
          provider: this.name,
          city,
          duration: duration * 1000,
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        });
      } catch (logError) {
        console.error("Logging error:", logError);
      }

      if (this.nextProvider) {
        try {
          this.logger.info("Trying next provider", {
            currentProvider: this.name,
            nextProvider: this.nextProvider.constructor.name,
            city,
            failedDuration: duration * 1000,
          });
        } catch (logError) {
          console.error("Logging error:", logError);
        }
        return this.nextProvider.getWeatherData(city);
      }
      throw new Error("Failed to fetch weather data for " + city + " from all providers");
    }
  }

  protected abstract fetchWeatherData(city: string): Promise<WeatherData>;
}
