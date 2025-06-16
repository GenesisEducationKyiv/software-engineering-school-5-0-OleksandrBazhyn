import WeatherManager from "../../../src/managers/WeatherManager.js";
import { WeatherData } from "../../../src/types.js";

describe("WeatherManager", () => {
  const OLD_ENV = process.env;
  let fetchMock: jest.Mock;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...OLD_ENV, WEATHER_API_KEY: "test-key" };
    fetchMock = jest.fn();
    // @ts-ignore
    global.fetch = fetchMock;
  });

  afterEach(() => {
    process.env = OLD_ENV;
    // @ts-ignore
    delete global.fetch;
    jest.clearAllMocks();
  });
  it("should warn if WEATHER_API_KEY is not set in constructor", () => {
    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    process.env.WEATHER_API_KEY = "";
    new WeatherManager();
    expect(warnSpy).toHaveBeenCalledWith("WEATHER_API_KEY is not set in environment variables.");
    warnSpy.mockRestore();
  });

  it("should throw if WEATHER_API_KEY is not set when calling getWeatherData", async () => {
    process.env.WEATHER_API_KEY = "";
    const manager = new WeatherManager();
    await expect(manager.getWeatherData("Kyiv")).rejects.toThrow(
      "WEATHER_API_KEY is not set in environment variables.",
    );
  });

  it("should fetch weather data and return it on success", async () => {
    const manager = new WeatherManager();
    const fakeWeather: WeatherData = {
      current: { temp_c: 10, humidity: 80, condition: { text: "Cloudy" } },
    } as WeatherData;
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => fakeWeather,
    });

    const result = await manager.getWeatherData("Kyiv");
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("https://api.weatherapi.com/v1/current.json"),
    );
    expect(result).toEqual(fakeWeather);
  });

  it("should throw if fetch returns not ok", async () => {
    const manager = new WeatherManager();
    fetchMock.mockResolvedValue({
      ok: false,
      json: async () => ({}),
    });

    await expect(manager.getWeatherData("Kyiv")).rejects.toThrow("Network response was not ok");
  });

  it("should throw if weather data is invalid", async () => {
    const manager = new WeatherManager();
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({}),
    });

    await expect(manager.getWeatherData("Kyiv")).rejects.toThrow("Invalid weather data received");
  });

  it("should log and throw if fetch throws", async () => {
    const manager = new WeatherManager();
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    fetchMock.mockRejectedValue(new Error("network fail"));

    await expect(manager.getWeatherData("Kyiv")).rejects.toThrow("Failed to fetch weather data");
    expect(errorSpy).toHaveBeenCalledWith("Error fetching weather data:", expect.any(Error));
    errorSpy.mockRestore();
  });
});
