import { WeatherProvider, WeatherData, WeatherProviderManagerInterface } from "../types.js";
import { WeatherAPIProvider } from "./WeatherAPIProvider.js";
import { OpenWeatherMapProvider } from "./OpenWeatherMapProvider.js";
import { WeatherCacheService } from "./WeatherCacheService.js";
import { RedisClient } from "./RedisClient.js";
import { Logger } from "winston";
import { createLogger } from "../logger/index.js";

export class WeatherProviderManager implements WeatherProviderManagerInterface {
  private chainHead: WeatherProvider;
  private logger: Logger;
  private cacheService: WeatherCacheService | null = null;

  constructor(logger?: Logger, redisClient?: RedisClient) {
    this.logger = logger || createLogger("WeatherProviderManager");

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
    if (this.cacheService) {
      try {
        const cachedData = await this.cacheService.get(city);
        if (cachedData) {
          this.logger.info(`Returning cached weather data for ${city}`);
          return cachedData;
        }
      } catch (error) {
        this.logger.warn(`Cache error for ${city}, falling back to providers:`, error);
      }
    }

    try {
      const weatherData = await this.chainHead.getWeatherData(city);

      if (weatherData && this.cacheService) {
        try {
          await this.cacheService.set(city, weatherData);
          this.logger.debug(`Weather data cached for ${city}`);
        } catch (cacheError) {
          this.logger.warn(`Failed to cache weather data for ${city}:`, cacheError);
        }
      }
      this.logger.debug(`Weather data retrieved for ${city}`, {
        provider: this.chainHead.constructor.name,
        data: weatherData,
      });
      return weatherData;
    } catch (error) {
      this.logger.error(`Failed to get weather data for ${city}:`, error);
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
