import { BaseWeatherProvider } from "../../src/services/providers/BaseWeatherProvider.js";
import { WeatherData, WeatherProvider } from "../../src/types.js";
import { Logger } from "winston";

// Mock logger for testing
const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
} as unknown as Logger;

class TestWeatherProvider extends BaseWeatherProvider {
  private shouldFail: boolean;

  constructor(
    logger: Logger,
    name: string = "TestProvider",
    shouldFail: boolean = false,
  ) {
    super(name, logger);
    this.shouldFail = shouldFail;
  }

  protected async fetchWeatherData(city: string): Promise<WeatherData> {
    if (this.shouldFail) {
      throw new Error(`${this.name} failed to fetch data`);
    }

    return {
      current: {
        temp_c: 20,
        humidity: 60,
        condition: { text: `Weather from ${this.name}` },
      },
    };
  }
}

describe("BaseWeatherProvider", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should fetch weather data and log response", async () => {
    const provider = new TestWeatherProvider(mockLogger);
    const result = await provider.getWeatherData("London");

    expect(result).toEqual({
      current: {
        temp_c: 20,
        humidity: 60,
        condition: { text: "Weather from TestProvider" },
      },
    });

    // Verify logger was called for successful response
    expect(mockLogger.info).toHaveBeenCalledWith(
      "Weather data fetched successfully",
      {
        provider: "TestProvider",
        city: "London",
        data: expect.objectContaining({
          current: expect.objectContaining({
            temp_c: 20,
            humidity: 60,
          }),
        }),
      },
    );
  });

  it("should pass request to next provider when current provider fails", async () => {
    const failingProvider = new TestWeatherProvider(
      mockLogger,
      "FailingProvider",
      true,
    );
    const workingProvider = new TestWeatherProvider(
      mockLogger,
      "WorkingProvider",
      false,
    );

    failingProvider.setNext(workingProvider);

    const result = await failingProvider.getWeatherData("London");

    expect(result).toEqual({
      current: {
        temp_c: 20,
        humidity: 60,
        condition: { text: "Weather from WorkingProvider" },
      },
    });

    // Verify error logging for failing provider
    expect(mockLogger.error).toHaveBeenCalledWith(
      "Error fetching weather data from provider",
      {
        provider: "FailingProvider",
        city: "London",
        error: expect.any(Error),
      },
    );

    // Verify info logging for trying next provider
    expect(mockLogger.info).toHaveBeenCalledWith("Trying next provider", {
      currentProvider: "FailingProvider",
      nextProvider: "TestWeatherProvider",
      city: "London",
    });

    // Verify success logging for working provider
    expect(mockLogger.info).toHaveBeenCalledWith(
      "Weather data fetched successfully",
      {
        provider: "WorkingProvider",
        city: "London",
        data: expect.objectContaining({
          current: expect.objectContaining({
            temp_c: 20,
            humidity: 60,
          }),
        }),
      },
    );
  });

  it("should throw error if all providers in chain fail", async () => {
    const failingProvider1 = new TestWeatherProvider(
      mockLogger,
      "FailingProvider1",
      true,
    );
    const failingProvider2 = new TestWeatherProvider(
      mockLogger,
      "FailingProvider2",
      true,
    );

    failingProvider1.setNext(failingProvider2);

    await expect(failingProvider1.getWeatherData("London")).rejects.toThrow(
      "Failed to fetch weather data for London from all providers",
    );

    // Verify error logging for first provider
    expect(mockLogger.error).toHaveBeenNthCalledWith(
      1,
      "Error fetching weather data from provider",
      {
        provider: "FailingProvider1",
        city: "London",
        error: expect.any(Error),
      },
    );

    // Verify error logging for second provider
    expect(mockLogger.error).toHaveBeenNthCalledWith(
      2,
      "Error fetching weather data from provider",
      {
        provider: "FailingProvider2",
        city: "London",
        error: expect.any(Error),
      },
    );
  });

  it("should handle logging gracefully - logger is injected dependency", async () => {
    // This test is less relevant now since logging is handled by Winston,
    // but we can test that the provider still works if logger throws
    const throwingLogger = {
      ...mockLogger,
      info: jest.fn().mockImplementation(() => {
        throw new Error("Logger error");
      }),
    } as unknown as Logger;

    const provider = new TestWeatherProvider(throwingLogger);

    // Should still return weather data even if logging fails
    const result = await provider.getWeatherData("London");

    expect(result).toEqual({
      current: {
        temp_c: 20,
        humidity: 60,
        condition: { text: "Weather from TestProvider" },
      },
    });
  });
});
