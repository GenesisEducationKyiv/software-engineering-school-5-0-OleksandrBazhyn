import type { WeatherServiceClient, WeatherData } from "../types.js";
import { config } from "../config.js";

class WeatherServiceHttpClient implements WeatherServiceClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = config.WEATHER_SERVICE_URL;
  }

  async getWeatherData(city: string): Promise<WeatherData | null> {
    try {
      const response = await fetch(
        `${this.baseUrl}/api/v1/weather?city=${encodeURIComponent(city)}`,
      );

      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error(`Weather service error: ${response.status}`);
      }

      const data = await response.json();

      return {
        current: {
          temp_c: data.temperature,
          humidity: data.humidity,
          condition: { text: data.description },
        },
      };
    } catch (error) {
      throw new Error(`Failed to fetch weather data: ${error}`);
    }
  }
}

export default WeatherServiceHttpClient;
