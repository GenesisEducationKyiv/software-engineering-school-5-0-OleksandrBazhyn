import { WeatherProviderManager } from "../../../src/services/weather/WeatherProviderManager.js";
import { WeatherAPIProvider } from "../../../src/services/weather/providers/WeatherAPIProvider.js";
import { OpenWeatherMapProvider } from "../../../src/services/weather/providers/OpenWeatherMapProvider.js";
import logger from "../../../src/logger/index.js";

jest.mock(
  "../../../src/services/weather/providers/WeatherAPIProvider.js",
  () => {
    return {
      WeatherAPIProvider: jest.fn().mockImplementation(() => ({
        setNext: jest.fn().mockReturnThis(),
        getWeatherData: jest.fn(),
      })),
    };
  },
);

jest.mock(
  "../../../src/services/weather/providers/OpenWeatherMapProvider.js",
  () => {
    return {
      OpenWeatherMapProvider: jest.fn().mockImplementation(() => ({
        setNext: jest.fn().mockReturnThis(),
        getWeatherData: jest.fn(),
      })),
    };
  },
);

describe("WeatherProviderManager", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should create chain of providers on initialization", () => {
    const mockSetNext = jest.fn().mockReturnThis();
    (WeatherAPIProvider as jest.Mock).mockImplementation(() => ({
      setNext: mockSetNext,
    }));

    const manager = new WeatherProviderManager(logger);

    expect(WeatherAPIProvider).toHaveBeenCalledWith(logger);
    expect(OpenWeatherMapProvider).toHaveBeenCalledWith(logger);
    expect(mockSetNext).toHaveBeenCalled();
  });
});
