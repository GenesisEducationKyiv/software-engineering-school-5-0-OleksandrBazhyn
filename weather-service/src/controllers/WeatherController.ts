import { Request, Response } from "express";
import { WeatherProviderManagerInterface, WeatherData, WeatherResponse } from "../types.js";
import { CityNotFound } from "../errors/index.js";
import { createLogger } from "../logger/index.js";

const logger = createLogger("WeatherController");

export class WeatherController {
  constructor(private weatherManager: WeatherProviderManagerInterface) {}

  async getWeather(req: Request, res: Response): Promise<Response> {
    const city = req.query.city as string | undefined;
    if (!city) {
      return res.status(400).json({ error: "Invalid request" });
    }

    try {
      const weatherData: WeatherData | null = await this.weatherManager.getWeatherData(city);

      if (!weatherData || !weatherData.current) {
        return res.status(404).json({ error: "City not found" });
      }

      const data: WeatherResponse = {
        temperature: weatherData.current.temp_c,
        humidity: weatherData.current.humidity,
        description: weatherData.current.condition.text,
      };

      return res.status(200).json(data);
    } catch (err: unknown) {
      if (err instanceof CityNotFound) {
        return res.status(404).json({ error: (err as Error).message });
      }
      logger.error("Weather service error:", err);
      return res.status(500).json({ error: "Weather service error" });
    }
  }
}
