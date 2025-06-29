import { WeatherProvider } from "../types.js";
import { WeatherAPIProvider } from "./WeatherAPIProvider.js";
import { OpenWeatherMapProvider } from "./OpenWeatherMapProvider.js";
import { Logger } from "winston";
import { createLogger } from "../logger/index.js";

export interface WeatherProviderManagerInterface {
  getProvider(): WeatherProvider;
}

export class WeatherProviderManager implements WeatherProviderManagerInterface {
  private chainHead: WeatherProvider;
  private logger: Logger;

  constructor(logger?: Logger) {
    this.logger = logger || createLogger("WeatherProviderManager");
    const weatherAPIProvider = new WeatherAPIProvider(this.logger);
    const openWeatherMapProvider = new OpenWeatherMapProvider(this.logger);

    weatherAPIProvider.setNext(openWeatherMapProvider);

    this.chainHead = weatherAPIProvider;
  }

  public getProvider(): WeatherProvider {
    return this.chainHead;
  }
}
