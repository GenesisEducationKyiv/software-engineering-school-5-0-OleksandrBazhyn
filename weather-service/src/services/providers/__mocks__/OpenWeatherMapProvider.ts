import { WeatherData, WeatherProvider } from "../../../types.js";
import { Logger } from "winston";

export const mockState = {
  weatherData: null as WeatherData | null,
  shouldFail: false,
  resetState() {
    this.weatherData = null;
    this.shouldFail = false;
  },
};

export class OpenWeatherMapProvider implements WeatherProvider {
  name = "OpenWeatherMap";
  private nextProvider?: WeatherProvider;
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  setNext(nextProvider: WeatherProvider): WeatherProvider {
    this.nextProvider = nextProvider;
    return this;
  }

  async getWeatherData(city: string): Promise<WeatherData> {
    // Check if we should simulate a failure
    if (mockState.shouldFail) {
      if (this.nextProvider) {
        return this.nextProvider.getWeatherData(city);
      }
      throw new Error(`Failed to fetch weather data for ${city} from all providers`);
    }

    // Return custom weather data if provided
    if (mockState.weatherData) {
      // Important: return a COPY of the data to avoid reference issues
      return JSON.parse(JSON.stringify(mockState.weatherData));
    }

    // Default mock data
    return {
      current: {
        temp_c: 20,
        humidity: 60,
        condition: { text: "Default mock condition" },
      },
    };
  }
}

export default OpenWeatherMapProvider;
