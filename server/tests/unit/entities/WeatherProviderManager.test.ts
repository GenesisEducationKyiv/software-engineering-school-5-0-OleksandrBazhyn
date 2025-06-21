import { WeatherProviderManager } from "../../../src/entities/WeatherProviderManager.js";
import { WeatherAPIProvider } from "../../../src/entities/WeatherAPIProvider.js";
import { OpenWeatherMapProvider } from "../../../src/entities/OpenWeatherMapProvider.js";

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
    // @ts-ignore
    WeatherProviderManager.instance = undefined;
  });

  it("should return a singleton instance", () => {
    const instance1 = WeatherProviderManager.getInstance();
    const instance2 = WeatherProviderManager.getInstance();
    
    expect(instance1).toBe(instance2);
  });

  it("should create chain of providers on initialization", () => {
    const mockSetNext = jest.fn().mockReturnThis();
    (WeatherAPIProvider as jest.Mock).mockImplementation(() => ({
      setNext: mockSetNext
    }));
    
    const manager = WeatherProviderManager.getInstance();
    
    expect(WeatherAPIProvider).toHaveBeenCalled();
    expect(OpenWeatherMapProvider).toHaveBeenCalled();
    expect(mockSetNext).toHaveBeenCalled();
  });

  it("should provide access to the head of the chain", () => {
    const mockChainHead = { getWeatherData: jest.fn() };
    (WeatherAPIProvider as jest.Mock).mockImplementation(() => ({
      setNext: jest.fn(),
      ...mockChainHead
    }));
    
    const manager = WeatherProviderManager.getInstance();
    expect(manager.getProvider()).toBeDefined();
  });
});
