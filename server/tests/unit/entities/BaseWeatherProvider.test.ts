import * as fs from "fs/promises";
import { BaseWeatherProvider } from "../../../src/entities/BaseWeatherProvider.js";
import { WeatherData, WeatherProvider } from "../../../src/types.js";

jest.mock("fs/promises");

class TestWeatherProvider extends BaseWeatherProvider {
  private shouldFail: boolean;

  constructor(name: string = "TestProvider", shouldFail: boolean = false) {
    super(name);
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
    (fs.mkdir as jest.Mock).mockResolvedValue(undefined);
    (fs.appendFile as jest.Mock).mockResolvedValue(undefined);
  });

  it("should fetch weather data and log response", async () => {
    const provider = new TestWeatherProvider();
    const result = await provider.getWeatherData("London");

    expect(result).toEqual({
      current: {
        temp_c: 20,
        humidity: 60,
        condition: { text: "Weather from TestProvider" },
      },
    });

    expect(fs.mkdir).toHaveBeenCalled();
    expect(fs.appendFile).toHaveBeenCalledWith(
      expect.any(String),
      expect.stringContaining("TestProvider - City: London - Response:")
    );
  });

  it("should pass request to next provider when current provider fails", async () => {
    const failingProvider = new TestWeatherProvider("FailingProvider", true);
    const workingProvider = new TestWeatherProvider("WorkingProvider", false);

    failingProvider.setNext(workingProvider);

    const result = await failingProvider.getWeatherData("London");

    expect(result).toEqual({
      current: {
        temp_c: 20,
        humidity: 60,
        condition: { text: "Weather from WorkingProvider" },
      },
    });

    expect(fs.appendFile).toHaveBeenNthCalledWith(
      1,
      expect.any(String),
      expect.stringContaining("FailingProvider - City: London - ERROR:")
    );

    expect(fs.appendFile).toHaveBeenCalledWith(
      expect.any(String),
      expect.stringContaining("WorkingProvider - City: London - Response:")
    );
  });

  it("should throw error if all providers in chain fail", async () => {
    const failingProvider1 = new TestWeatherProvider("FailingProvider1", true);
    const failingProvider2 = new TestWeatherProvider("FailingProvider2", true);

    failingProvider1.setNext(failingProvider2);

    await expect(failingProvider1.getWeatherData("London"))
      .rejects.toThrow("Failed to fetch weather data for London from all providers");

    expect(fs.appendFile).toHaveBeenNthCalledWith(
      1,
      expect.any(String),
      expect.stringContaining("FailingProvider1 - City: London - ERROR:")
    );

    expect(fs.appendFile).toHaveBeenNthCalledWith(
      2,
      expect.any(String),
      expect.stringContaining("FailingProvider2 - City: London - ERROR:")
    );
  });

  it("should handle logging errors gracefully", async () => {
    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => { });
    (fs.appendFile as jest.Mock).mockRejectedValue(new Error("Filesystem error"));

    const provider = new TestWeatherProvider();
    const result = await provider.getWeatherData("London");

    expect(result).toEqual({
      current: {
        temp_c: 20,
        humidity: 60,
        condition: { text: "Weather from TestProvider" },
      },
    });

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("Failed to log response from TestProvider:"),
      expect.any(Error)
    );

    consoleSpy.mockRestore();
  });
});
