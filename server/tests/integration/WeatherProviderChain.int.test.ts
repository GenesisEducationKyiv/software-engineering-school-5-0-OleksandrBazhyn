import { WeatherProviderManager } from "../../src/entities/WeatherProviderManager.js";
import { mockState as weatherAPIState } from "../../src/entities/__mocks__/WeatherAPIProvider.js";
import { mockState as openWeatherMapState } from "../../src/entities/__mocks__/OpenWeatherMapProvider.js";
import { WeatherData } from "../../src/types.js";
import logger from "../../src/logger/index.js";

// Important: Mock both providers AND the manager
jest.mock("../../src/entities/WeatherAPIProvider.js");
jest.mock("../../src/entities/OpenWeatherMapProvider.js");
jest.mock("../../src/entities/WeatherProviderManager.js");

describe("Weather Provider Chain Integration", () => {
  beforeEach(() => {
    // Reset all mocks and states before each test
    jest.clearAllMocks();
    weatherAPIState.resetState();
    openWeatherMapState.resetState();
  });

  it("should try next provider when first one fails", async () => {
    // Set up the test data
    const testData = {
      current: {
        temp_c: 15,
        humidity: 70,
        condition: { text: "Partly cloudy" }
      }
    } as WeatherData;
    
    // Configure the providers
    weatherAPIState.shouldFail = true;
    openWeatherMapState.weatherData = testData;
    
    // Create a new instance of the manager with logger
    const manager = new WeatherProviderManager(logger);
    const result = await manager.getProvider().getWeatherData("London");
    
    expect(result).toEqual(testData);
  });
  
  it("should use first provider when it works correctly", async () => {
    const testData = {
      current: {
        temp_c: 22,
        humidity: 55,
        condition: { text: "Sunny" }
      }
    } as WeatherData;
    
    // Set the test data on the first provider
    weatherAPIState.weatherData = testData;
    
    const manager = new WeatherProviderManager(logger);
    const result = await manager.getProvider().getWeatherData("London");
    
    expect(result).toEqual(testData);
  });
  
  it("should throw if all providers fail", async () => {
    // Make both providers fail
    weatherAPIState.shouldFail = true;
    openWeatherMapState.shouldFail = true;
    
    const manager = new WeatherProviderManager(logger);
    await expect(manager.getProvider().getWeatherData("London"))
      .rejects
      .toThrow("Failed to fetch weather data for London from all providers");
  });
});
