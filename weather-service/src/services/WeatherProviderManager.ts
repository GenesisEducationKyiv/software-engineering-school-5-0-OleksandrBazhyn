import { WeatherProvider, WeatherData, WeatherProviderManagerInterface } from "../types.js";
import { WeatherAPIProvider } from "./providers/WeatherAPIProvider.js";
import { OpenWeatherMapProvider } from "./providers/OpenWeatherMapProvider.js";
import { WeatherCacheService } from "./cache/WeatherCacheService.js";
import { RedisClient } from "./cache/RedisClient.js";
import { Logger } from "winston";
import { cacheOperationsTotal, weatherRequestsByCity, errorRate } from "../metrics/index.js";

export class WeatherProviderManager implements WeatherProviderManagerInterface {
  private chainHead: WeatherProvider;
  private logger: Logger;
  private cacheService: WeatherCacheService | null = null;

  constructor(logger: Logger, redisClient?: RedisClient) {
    this.logger = logger;

    if (redisClient) {
      this.cacheService = new WeatherCacheService(redisClient, this.logger);
    }

    const weatherAPIProvider = new WeatherAPIProvider(this.logger);
    const openWeatherMapProvider = new OpenWeatherMapProvider(this.logger);

    weatherAPIProvider.setNext(openWeatherMapProvider);

    this.chainHead = weatherAPIProvider;
  }

  public getProvider(): WeatherProvider {
    return this.chainHead;
  }

  public async getWeatherData(city: string): Promise<WeatherData | null> {
    const startTime = Date.now();

    // Track requests by city
    weatherRequestsByCity.inc({ city });

    this.logger.debug("Getting weather data", {
      city,
      service: "WeatherProviderManager",
    });

    if (this.cacheService) {
      try {
        const cachedData = await this.cacheService.get(city);

        if (cachedData) {
          cacheOperationsTotal.inc({ operation: "hit", status: "success" });
          this.logger.info("Returning cached weather data", {
            city,
            duration: Date.now() - startTime,
            source: "cache",
          });
          return cachedData;
        }

        cacheOperationsTotal.inc({ operation: "miss", status: "success" });
        this.logger.debug("Cache miss for city", { city });
      } catch (error) {
        cacheOperationsTotal.inc({ operation: "miss", status: "error" });
        errorRate.inc({ type: "cache", service: "get" });
        this.logger.error("Cache error, falling back to providers", {
          city,
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        });
      }
    }

    try {
      const weatherData = await this.chainHead.getWeatherData(city);

      if (weatherData && this.cacheService) {
        try {
          await this.cacheService.set(city, weatherData);
          cacheOperationsTotal.inc({ operation: "set", status: "success" });
          this.logger.debug("Weather data cached successfully", { city });
        } catch (cacheError) {
          cacheOperationsTotal.inc({ operation: "set", status: "error" });
          errorRate.inc({ type: "cache", service: "set" });
          this.logger.warn("Failed to cache weather data", {
            city,
            error: cacheError instanceof Error ? cacheError.message : String(cacheError),
          });
        }
      }

      const duration = Date.now() - startTime;
      this.logger.info("Weather data retrieved successfully", {
        city,
        duration,
        provider: this.chainHead.constructor.name,
        source: "provider",
      });

      return weatherData;
    } catch (error) {
      errorRate.inc({ type: "provider", service: "weather" });
      this.logger.error("Failed to get weather data", {
        city,
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      return null;
    }
  }

  public getCacheService(): WeatherCacheService | null {
    if (!this.cacheService) {
      this.logger.warn("Cache service is not initialized.");
      return null;
    }
    return this.cacheService;
  }
}

export default WeatherProviderManager;
