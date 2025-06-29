import { WeatherProvider } from "../types.js";
import { WeatherAPIProvider } from "./WeatherAPIProvider.js";
import { OpenWeatherMapProvider } from "./OpenWeatherMapProvider.js";
import { Logger } from "winston";

export interface WeatherProviderManagerInterface {
  getProvider(): WeatherProvider;
}

export class WeatherProviderManager implements WeatherProviderManagerInterface {
  private chainHead: WeatherProvider;

  constructor(logger: Logger) {
    const weatherAPIProvider = new WeatherAPIProvider(logger);
    const openWeatherMapProvider = new OpenWeatherMapProvider(logger);

    weatherAPIProvider.setNext(openWeatherMapProvider);

    this.chainHead = weatherAPIProvider;
  }

  public getProvider(): WeatherProvider {
    return this.chainHead;
  }
}
