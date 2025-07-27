import { WeatherAPIProvider } from "../../src/services/providers/WeatherAPIProvider.js";
import { config } from "../../src/config.js";
import { Logger } from "winston";

// Mock logger for testing
const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
} as unknown as Logger;

describe("WeatherAPIProvider", () => {
  let originalConfig: typeof config;
  let fetchMock: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    originalConfig = { ...config };
    fetchMock = jest.spyOn(global, "fetch").mockImplementation();
    config.WEATHER_API_KEY = "test-key";
  });

  afterEach(() => {
    jest.restoreAllMocks();
    config.WEATHER_API_KEY = originalConfig.WEATHER_API_KEY;
  });

  it("should throw if WEATHER_API_KEY is not set in constructor", () => {
    config.WEATHER_API_KEY = "";
    expect(() => new WeatherAPIProvider(mockLogger)).toThrow(
      "WEATHER_API_KEY is not set in environment variables.",
    );
  });

  it("should fetch weather data and return it on success", async () => {
    const provider = new WeatherAPIProvider(mockLogger);
    const fakeWeather = {
      current: {
        temp_c: 10,
        humidity: 80,
        condition: { text: "Cloudy" },
      },
    };

    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => fakeWeather,
    });

    const result = await provider.getWeatherData("London");

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("https://api.weatherapi.com/v1/current.json"),
    );

    expect(result).toEqual({
      current: {
        temp_c: 10,
        humidity: 80,
        condition: { text: "Cloudy" },
      },
    });
  });

  it("should throw network error and log it when fetch returns not ok", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 404,
    } as Response);

    const provider = new WeatherAPIProvider(mockLogger);

    await expect(provider.getWeatherData("London")).rejects.toThrow(
      "Failed to fetch weather data for London from all providers",
    );

    expect(mockLogger.error).toHaveBeenCalledWith(
      "Error fetching weather data from provider",
      expect.objectContaining({
        provider: "WeatherAPI",
        city: "London",
        error: expect.any(Error),
      }),
    );
  });

  it("should throw data validation error and log it when weather data is invalid", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    } as Response);

    const provider = new WeatherAPIProvider(mockLogger);

    await expect(provider.getWeatherData("London")).rejects.toThrow(
      "Failed to fetch weather data for London from all providers",
    );

    expect(mockLogger.error).toHaveBeenCalledWith(
      "Error fetching weather data from provider",
      expect.objectContaining({
        provider: "WeatherAPI",
        city: "London",
        error: expect.any(Error),
      }),
    );
  });

  it("should include API key in the request URL", async () => {
    config.WEATHER_API_KEY = "special-test-key";
    const provider = new WeatherAPIProvider(mockLogger);
    const fakeWeather = {
      current: {
        temp_c: 10,
        humidity: 80,
        condition: { text: "Cloudy" },
      },
    };

    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => fakeWeather,
    });

    await provider.getWeatherData("London");

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("key=special-test-key"),
    );
  });

  it("should properly encode the location in the URL", async () => {
    const provider = new WeatherAPIProvider(mockLogger);
    const fakeWeather = {
      current: {
        temp_c: 10,
        humidity: 80,
        condition: { text: "Cloudy" },
      },
    };

    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => fakeWeather,
    });

    await provider.getWeatherData("New York");

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("q=New%20York"),
    );
  });

  it("should handle network errors during fetch", async () => {
    fetchMock.mockRejectedValue(new Error("Network failure"));

    const provider = new WeatherAPIProvider(mockLogger);

    await expect(provider.getWeatherData("London")).rejects.toThrow(
      "Failed to fetch weather data for London from all providers",
    );

    expect(mockLogger.error).toHaveBeenCalledWith(
      "Error fetching weather data from provider",
      expect.objectContaining({
        provider: "WeatherAPI",
        city: "London",
        error: expect.any(Error),
      }),
    );
  });

  it("should handle malformed JSON response", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: () => Promise.reject(new SyntaxError("Unexpected token in JSON")),
    } as any);

    const provider = new WeatherAPIProvider(mockLogger);

    await expect(provider.getWeatherData("London")).rejects.toThrow(
      "Failed to fetch weather data for London from all providers",
    );

    expect(mockLogger.error).toHaveBeenCalledWith(
      "Error fetching weather data from provider",
      expect.objectContaining({
        provider: "WeatherAPI",
        city: "London",
        error: expect.any(SyntaxError),
      }),
    );
  });
});
