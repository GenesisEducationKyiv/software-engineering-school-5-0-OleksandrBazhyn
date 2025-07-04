import { WeatherProviderManager } from "../../../src/entities/WeatherProviderManager.js";
import { WeatherAPIProvider } from "../../../src/entities/WeatherAPIProvider.js";
import { OpenWeatherMapProvider } from "../../../src/entities/OpenWeatherMapProvider.js";
import logger from "../../../src/logger/index.js";

jest.mock("../../../src/entities/WeatherAPIProvider.js", () => {
  return {
    WeatherAPIProvider: jest.fn().mockImplementation(() => ({
      setNext: jest.fn().mockReturnThis(),
      getWeatherData: jest.fn()
    }))
  };
});

jest.mock("../../../src/entities/OpenWeatherMapProvider.js", () => {
  return {
    OpenWeatherMapProvider: jest.fn().mockImplementation(() => ({
      setNext: jest.fn().mockReturnThis(),
      getWeatherData: jest.fn()
    }))
  };
});

describe("WeatherProviderManager", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should create chain of providers on initialization", () => {
    const mockSetNext = jest.fn().mockReturnThis();
    (WeatherAPIProvider as jest.Mock).mockImplementation(() => ({
      setNext: mockSetNext
    }));
    
    const manager = new WeatherProviderManager(logger);
    
    expect(WeatherAPIProvider).toHaveBeenCalledWith(logger);
    expect(OpenWeatherMapProvider).toHaveBeenCalledWith(logger);
    expect(mockSetNext).toHaveBeenCalled();
  });

  it("should provide access to the head of the chain", () => {
    const mockChainHead = { getWeatherData: jest.fn() };
    (WeatherAPIProvider as jest.Mock).mockImplementation(() => ({
      setNext: jest.fn(),
      ...mockChainHead
    }));
    
    const manager = new WeatherProviderManager(logger);
    expect(manager.getProvider()).toBeDefined();
  });
});
