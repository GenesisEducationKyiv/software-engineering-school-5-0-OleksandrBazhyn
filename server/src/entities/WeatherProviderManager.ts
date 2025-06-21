import { WeatherProvider } from "../types.js";
import { WeatherAPIProvider } from "./WeatherAPIProvider.js";
import { OpenWeatherMapProvider } from "./OpenWeatherMapProvider.js";

export class WeatherProviderManager {
  private static instance: WeatherProviderManager;
  private chainHead: WeatherProvider;

  private constructor() {
    const weatherAPIProvider = new WeatherAPIProvider();
    const openWeatherMapProvider = new OpenWeatherMapProvider();

    weatherAPIProvider.setNext(openWeatherMapProvider);

    this.chainHead = weatherAPIProvider;
  }

  public static getInstance(): WeatherProviderManager {
    if (!WeatherProviderManager.instance) {
      WeatherProviderManager.instance = new WeatherProviderManager();
    }
    return WeatherProviderManager.instance;
  }

  public getProvider(): WeatherProvider {
    return this.chainHead;
  }
}

export default WeatherProviderManager;
