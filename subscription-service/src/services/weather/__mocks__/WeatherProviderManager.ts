import { WeatherProvider, WeatherProviderManagerInterface } from "../../../types.js";
import { WeatherAPIProvider } from "../providers/WeatherAPIProvider.js";
import { OpenWeatherMapProvider } from "../providers/OpenWeatherMapProvider.js";
import { Logger } from "winston";

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

  public async getWeatherData(city: string) {
    return await this.chainHead.getWeatherData(city);
  }
}

export default WeatherProviderManager;
