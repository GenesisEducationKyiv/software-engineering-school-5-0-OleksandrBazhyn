import { WeatherProvider } from "../../types.js";
import { WeatherAPIProvider } from "./WeatherAPIProvider.js";
import { OpenWeatherMapProvider } from "./OpenWeatherMapProvider.js";

export class WeatherProviderManager {
  private static instance: WeatherProviderManager | undefined;
  private provider: WeatherProvider;

  private constructor() {
    const weatherAPIProvider = new WeatherAPIProvider();
    const openWeatherMapProvider = new OpenWeatherMapProvider();

    weatherAPIProvider.setNext(openWeatherMapProvider);

    this.provider = weatherAPIProvider;
  }

  public static getInstance(): WeatherProviderManager {
    if (!WeatherProviderManager.instance) {
      WeatherProviderManager.instance = new WeatherProviderManager();
    }
    return WeatherProviderManager.instance;
  }

  public static resetInstance(): void {
    WeatherProviderManager.instance = undefined;
  }

  public getProvider(): WeatherProvider {
    return this.provider;
  }
}

export default WeatherProviderManager;
