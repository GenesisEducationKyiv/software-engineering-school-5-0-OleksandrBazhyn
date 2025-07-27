import request from "supertest";
import { WeatherController } from "../../src/controllers/WeatherController.js";
import { WeatherProviderManagerInterface } from "../../src/types.js";
import express from "express";
import { Logger } from "winston";

describe("Weather API Integration Tests", () => {
  let app: express.Application;
  let mockWeatherManager: jest.Mocked<WeatherProviderManagerInterface>;
  let mockLogger: jest.Mocked<Logger>;

  beforeEach(() => {
    mockWeatherManager = {
      getWeatherData: jest.fn(),
      getProvider: jest.fn(),
    };

    mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    } as unknown as jest.Mocked<Logger>;

    app = express();
    app.use(express.json());

    const weatherController = new WeatherController(mockWeatherManager);
    app.get(
      "/api/v1/weather",
      weatherController.getWeather.bind(weatherController),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("GET /api/v1/weather", () => {
    it("should return weather data for valid city", async () => {
      const mockWeatherData = {
        current: {
          temp_c: 20,
          humidity: 60,
          condition: { text: "Sunny" },
        },
      };

      mockWeatherManager.getWeatherData.mockResolvedValue(mockWeatherData);

      const response = await request(app)
        .get("/api/v1/weather")
        .query({ city: "London" })
        .expect(200);

      expect(response.body).toEqual({
        temperature: 20,
        humidity: 60,
        description: "Sunny",
      });

      expect(mockWeatherManager.getWeatherData).toHaveBeenCalledWith("London");
    });

    it("should return 400 for missing city parameter", async () => {
      const response = await request(app).get("/api/v1/weather").expect(400);

      expect(response.body).toEqual({
        error: "Invalid request",
      });
    });

    it("should return 500 for weather provider errors", async () => {
      mockWeatherManager.getWeatherData.mockRejectedValue(
        new Error("Provider error"),
      );

      const response = await request(app)
        .get("/api/v1/weather")
        .query({ city: "London" })
        .expect(500);

      expect(response.body).toEqual({
        error: "Weather service error",
      });
    });

    it("should handle special characters in city name", async () => {
      const mockWeatherData = {
        current: {
          temp_c: 25,
          humidity: 50,
          condition: { text: "Clear" },
        },
      };

      mockWeatherManager.getWeatherData.mockResolvedValue(mockWeatherData);

      const response = await request(app)
        .get("/api/v1/weather")
        .query({ city: "São Paulo" })
        .expect(200);

      expect(response.body).toEqual({
        temperature: 25,
        humidity: 50,
        description: "Clear",
      });
      expect(mockWeatherManager.getWeatherData).toHaveBeenCalledWith(
        "São Paulo",
      );
    });
  });
});
