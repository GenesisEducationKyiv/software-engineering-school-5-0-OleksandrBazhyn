import { WeatherCacheService } from "../../../src/services/cache/WeatherCacheService.js";
import { RedisClient } from "../../../src/services/cache/RedisClient.js";
import { WeatherData } from "../../../src/types.js";

describe("WeatherCacheService", () => {
  let cacheService: WeatherCacheService;
  let mockRedisClient: jest.Mocked<RedisClient>;
  let mockLogger: any;

  const testWeatherData: WeatherData = {
    current: {
      temp_c: 20,
      humidity: 60,
      condition: { text: "Sunny" },
    },
  };

  beforeEach(() => {
    mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    };

    mockRedisClient = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      exists: jest.fn(),
      connect: jest.fn(),
      disconnect: jest.fn(),
      isConnected: jest.fn(),
    } as unknown as jest.Mocked<RedisClient>;

    cacheService = new WeatherCacheService(mockRedisClient, mockLogger);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("get", () => {
    it("should return cached weather data when available", async () => {
      const serializedData = JSON.stringify(testWeatherData);
      mockRedisClient.get.mockResolvedValue(serializedData);

      const result = await cacheService.get("London");

      expect(result).toEqual(testWeatherData);
      expect(mockRedisClient.get).toHaveBeenCalledWith("weather:london");
      expect(mockLogger.info).toHaveBeenCalledWith(
        "Cache hit for weather data: London",
      );
    });

    it("should return null when no cached data available", async () => {
      mockRedisClient.get.mockResolvedValue(null);

      const result = await cacheService.get("London");

      expect(result).toBeNull();
      expect(mockRedisClient.get).toHaveBeenCalledWith("weather:london");
      expect(mockLogger.debug).toHaveBeenCalledWith(
        "Cache miss for weather data: London",
      );
    });

    it("should handle JSON parse errors", async () => {
      mockRedisClient.get.mockResolvedValue("invalid json");
      mockRedisClient.del.mockResolvedValue();

      const result = await cacheService.get("London");

      expect(result).toBeNull();
      expect(mockRedisClient.del).toHaveBeenCalledWith("weather:london");
      expect(mockLogger.error).toHaveBeenCalledWith(
        "Error parsing cached data for London:",
        expect.any(Error),
      );
    });

    it("should handle Redis errors gracefully", async () => {
      mockRedisClient.get.mockRejectedValue(new Error("Redis error"));

      const result = await cacheService.get("London");

      expect(result).toBeNull();
      expect(mockLogger.error).toHaveBeenCalledWith(
        "Error getting weather data from cache for London:",
        expect.any(Error),
      );
    });
  });

  describe("set", () => {
    it("should cache weather data successfully", async () => {
      mockRedisClient.set.mockResolvedValue();

      await cacheService.set("London", testWeatherData);

      expect(mockRedisClient.set).toHaveBeenCalledWith(
        "weather:london",
        JSON.stringify(testWeatherData),
        300,
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        "Weather data cached for London (TTL: 300s)",
      );
    });

    it("should use custom TTL when provided", async () => {
      mockRedisClient.set.mockResolvedValue();

      await cacheService.set("London", testWeatherData, 600);

      expect(mockRedisClient.set).toHaveBeenCalledWith(
        "weather:london",
        JSON.stringify(testWeatherData),
        600,
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        "Weather data cached for London (TTL: 600s)",
      );
    });

    it("should handle Redis errors", async () => {
      mockRedisClient.set.mockRejectedValue(new Error("Redis error"));

      await expect(cacheService.set("London", testWeatherData)).rejects.toThrow(
        "Redis error",
      );
      expect(mockLogger.error).toHaveBeenCalledWith(
        "Error caching weather data for London:",
        expect.any(Error),
      );
    });
  });

  describe("invalidate", () => {
    it("should delete cached data successfully", async () => {
      mockRedisClient.del.mockResolvedValue();

      await cacheService.invalidate("London");

      expect(mockRedisClient.del).toHaveBeenCalledWith("weather:london");
      expect(mockLogger.info).toHaveBeenCalledWith(
        "Cache invalidated for London",
      );
    });

    it("should handle Redis errors", async () => {
      mockRedisClient.del.mockRejectedValue(new Error("Redis error"));

      await expect(cacheService.invalidate("London")).rejects.toThrow(
        "Redis error",
      );
      expect(mockLogger.error).toHaveBeenCalledWith(
        "Error invalidating cache for London:",
        expect.any(Error),
      );
    });
  });

  describe("exists", () => {
    it("should check if cache exists", async () => {
      mockRedisClient.exists.mockResolvedValue(true);

      const result = await cacheService.exists("London");

      expect(result).toBe(true);
      expect(mockRedisClient.exists).toHaveBeenCalledWith("weather:london");
    });

    it("should handle Redis errors", async () => {
      mockRedisClient.exists.mockRejectedValue(new Error("Redis error"));

      const result = await cacheService.exists("London");

      expect(result).toBe(false);
      expect(mockLogger.error).toHaveBeenCalledWith(
        "Error checking cache existence for London:",
        expect.any(Error),
      );
    });
  });

  describe("TTL management", () => {
    it("should set and get default TTL", () => {
      cacheService.setDefaultTTL(600);

      expect(cacheService.getDefaultTTL()).toBe(600);
      expect(mockLogger.info).toHaveBeenCalledWith(
        "Default cache TTL set to 600 seconds",
      );
    });
  });
});
