import { OpenWeatherMapProvider } from "../../../src/services/weather/providers/OpenWeatherMapProvider.js";
import { config } from "../../../src/config.js";
import { Logger } from "winston";

// Mock logger for testing
const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
} as unknown as Logger;

describe("OpenWeatherMapProvider", () => {
  let originalApiKey: string;
  let fetchMock: jest.SpyInstance;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Save original API key
    originalApiKey = process.env.OPENWEATHERMAP_API_KEY || "";

    // Set test API key in both environment and config
    process.env.OPENWEATHERMAP_API_KEY = "test-api-key";
    config.OPENWEATHERMAP_API_KEY = "test-api-key";

    // Fix the fetch mock implementation to accept the correct parameter types
    fetchMock = jest
      .spyOn(global, "fetch")
      .mockImplementation(
        async (input: RequestInfo | URL, init?: RequestInit) => {
          const url = typeof input === "string" ? input : input.toString();

          if (url.includes("api.openweathermap.org/geo/1.0/direct")) {
            return {
              ok: true,
              json: async () => [{ lat: 51.5074, lon: 0.1278 }],
            } as Response;
          }

          if (url.includes("api.openweathermap.org/data/2.5/weather")) {
            return {
              ok: true,
              json: async () => ({
                main: {
                  temp: 15,
                  humidity: 70,
                },
                weather: [
                  {
                    description: "Partly cloudy",
                  },
                ],
              }),
            } as Response;
          }

          return {
            ok: false,
            status: 404,
          } as Response;
        },
      );
  });

  afterEach(() => {
    // Restore original API key
    process.env.OPENWEATHERMAP_API_KEY = originalApiKey;
    config.OPENWEATHERMAP_API_KEY = originalApiKey;

    jest.restoreAllMocks();
  });

  it("should have API key from environment variables", () => {
    const provider = new OpenWeatherMapProvider(mockLogger);
    // @ts-ignore - accessing private property for testing
    expect(provider.OPENWEATHERMAP_API_KEY).toBe("test-api-key");
  });

  it("should fetch weather data successfully", async () => {
    const provider = new OpenWeatherMapProvider(mockLogger);
    const result = await provider.getWeatherData("London");

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result).toEqual({
      current: {
        temp_c: 15,
        humidity: 70,
        condition: { text: "Partly cloudy" },
      },
    });
  });

  it("should throw if city is not found", async () => {
    fetchMock.mockImplementationOnce(
      async () =>
        ({
          ok: true,
          json: async () => [], // Empty array means city not found
        }) as Response,
    );

    const provider = new OpenWeatherMapProvider(mockLogger);
    await expect(provider.getWeatherData("NonexistentCity")).rejects.toThrow(
      "Failed to fetch weather data for NonexistentCity from all providers",
    );
  });

  it("should handle weather API errors", async () => {
    const provider = new OpenWeatherMapProvider(mockLogger);

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => [{ lat: 51.5074, lon: 0.1278 }],
    });

    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    await expect(provider.getWeatherData("London")).rejects.toThrow();
  });

  it("should handle empty geocoding results", async () => {
    const provider = new OpenWeatherMapProvider(mockLogger);

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    });

    await expect(provider.getWeatherData("NonexistentCity")).rejects.toThrow();
  });

  it("should handle invalid weather data format", async () => {
    const provider = new OpenWeatherMapProvider(mockLogger);

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => [{ lat: 51.5074, lon: 0.1278 }],
    });

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    });

    await expect(provider.getWeatherData("London")).rejects.toThrow();
  });
});
