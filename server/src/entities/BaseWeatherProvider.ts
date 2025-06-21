import { WeatherData, WeatherProvider } from "../types.js";
import fs from "fs/promises";
import path from "path";

export abstract class BaseWeatherProvider implements WeatherProvider {
  protected nextProvider: WeatherProvider | null = null;
  protected name: string;
  protected logPath: string;

  constructor(name: string) {
    this.name = name;
    this.logPath = path.join(process.cwd(), "logs", "weather-providers.log");
  }

  setNext(provider: WeatherProvider): WeatherProvider {
    this.nextProvider = provider;
    return provider;
  }

  async getWeatherData(city: string): Promise<WeatherData> {
    try {
      const data = await this.fetchWeatherData(city);
      await this.logResponse(city, data);
      return data;
    } catch (error) {
      console.error(`Error fetching weather data from ${this.name}:`, error);
      await this.logError(city, error);

      if (this.nextProvider) {
        console.log(`Trying next provider: ${this.nextProvider.constructor.name}`);
        return this.nextProvider.getWeatherData(city);
      }
      throw new Error(`Failed to fetch weather data for ${city} from all providers`);
    }
  }

  protected abstract fetchWeatherData(city: string): Promise<WeatherData>;

  protected async logResponse(city: string, data: WeatherData): Promise<void> {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${this.name} - City: ${city} - Response: ${JSON.stringify(data)}\n`;

    try {
      const logDir = path.dirname(this.logPath);
      await fs.mkdir(logDir, { recursive: true });

      await fs.appendFile(this.logPath, logEntry);
    } catch (error) {
      console.error(`Failed to log response from ${this.name}:`, error);
    }
  }

  protected async logError(city: string, error: unknown): Promise<void> {
    const timestamp = new Date().toISOString();
    const errorMessage = error instanceof Error ? error.message : String(error);
    const logEntry = `[${timestamp}] ${this.name} - City: ${city} - ERROR: ${errorMessage}\n`;

    try {
      const logDir = path.dirname(this.logPath);
      await fs.mkdir(logDir, { recursive: true });

      await fs.appendFile(this.logPath, logEntry);
    } catch (err) {
      console.error(`Failed to log error from ${this.name}:`, err);
    }
  }
}
