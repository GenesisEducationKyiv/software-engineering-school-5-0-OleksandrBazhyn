import { WeatherData, WeatherProvider } from "../../types.js";

class MockWeatherAPIClient implements WeatherProvider {
  async getWeatherData(city: string): Promise<WeatherData> {
    if (city === "UnknownCity") {
      throw new Error("Not found");
    }

    return {
      current: {
        temp_c: 15,
        humidity: 44,
        condition: { text: "Cloudy" },
      },
    };
  }
}

export default MockWeatherAPIClient;
