import { WeatherAPIProvider } from "../../../src/entities/WeatherAPIProvider.js";
import { config } from "../../../src/config.js";

describe("WeatherAPIProvider", () => {
  let originalConfig: typeof config;
  let warnSpy: jest.SpyInstance;
  let fetchMock: jest.SpyInstance;
  
  beforeEach(() => {
    originalConfig = { ...config };
    warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    fetchMock = jest.spyOn(global, "fetch").mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    config.WEATHER_API_KEY = originalConfig.WEATHER_API_KEY;
  });

  it("should warn if WEATHER_API_KEY is not set in constructor", () => {
    config.WEATHER_API_KEY = "";
    new WeatherAPIProvider();
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("WEATHER_API_KEY is not set"));
  });

  it("should throw if WEATHER_API_KEY is not set when calling fetchWeatherData", async () => {
    config.WEATHER_API_KEY = "";
    const provider = new WeatherAPIProvider();
    
    await expect(provider.getWeatherData("London")).rejects.toThrow(
      "Failed to fetch weather data for London from all providers"
    );
  });

  it("should fetch weather data and return it on success", async () => {
    const provider = new WeatherAPIProvider();
    const fakeWeather = {
      current: { 
        temp_c: 10, 
        humidity: 80, 
        condition: { text: "Cloudy" } 
      }
    };
    
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => fakeWeather,
    });

    const result = await provider.getWeatherData("London");
    
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("https://api.weatherapi.com/v1/current.json")
    );
    
    expect(result).toEqual({
      current: {
        temp_c: 10,
        humidity: 80,
        condition: { text: "Cloudy" }
      }
    });
  });

  it("should throw if fetch returns not ok", async () => {
    config.WEATHER_API_KEY = "test-key";
    fetchMock.mockResolvedValue({
      ok: false,
      status: 404
    } as Response);
    
    const provider = new WeatherAPIProvider();
    
    await expect(provider.getWeatherData("London")).rejects.toThrow(
      "Failed to fetch weather data for London from all providers"
    );
  });

  it("should throw if weather data is invalid", async () => {
    config.WEATHER_API_KEY = "test-key";
    fetchMock.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({})
    } as Response);
    
    const provider = new WeatherAPIProvider();
    
    await expect(provider.getWeatherData("London")).rejects.toThrow(
      "Failed to fetch weather data for London from all providers"
    );
  });
});