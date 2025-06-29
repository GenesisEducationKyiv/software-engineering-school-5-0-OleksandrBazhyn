import express from "express";
import { WeatherProviderManager } from "../entities/WeatherProviderManager.js";
import SubscriptionService from "../entities/SubscriptionService.js";
import { WeatherData, SubscriptionInput, WeatherResponse } from "../types.js";
import MailManager from "../entities/MailManager.js";
import SubscriptionDataProvider from "../entities/SubscriptionDataProvider.js";
import { config } from "../config.js";
import {
  SubscriptionError,
  AlreadySubscribedError,
  NotConfirmedError,
  InvalidTokenError,
  CityNotFound,
} from "../errors/SubscriptionError.js";
import nodemailer from "nodemailer";
import { Cipheriv } from "crypto";

const router = express.Router();
const subscriptionService = new SubscriptionService(
  new MailManager(
    nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: config.SMTP_USER,
        pass: config.SMTP_PASS,
      },
    }),
  ),
  SubscriptionDataProvider,
);

router.get("/weather", async (req: express.Request, res: express.Response) => {
  const city = req.query.city as string | undefined;
  if (!city) {
    return res.status(400).json({ error: "Invalid request" });
  }
  try {
    const weatherManager = WeatherProviderManager.getInstance();
    const weatherData: WeatherData = await weatherManager.getProvider().getWeatherData(city);

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
      return res.status(404).json({ error: err.message });
    }
    console.error(err);
  }
});

router.post("/subscribe", async (req: express.Request, res: express.Response) => {
  console.log("Request body:", req.body);
  const { email, city, frequency } = req.body as SubscriptionInput;

  if (!email || !city || !frequency || !["daily", "hourly"].includes(frequency)) {
    return res.status(400).json({ error: "Invalid input" });
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: "Invalid input" });
  }

  try {
    const weatherManager = new WeatherAPIClient();
    const weatherData: WeatherData = await weatherManager.getWeatherData(city);
    if (!weatherData) {
      return res.status(404).json({ error: "City not found" });
    }
  } catch (err: unknown) {
    if (err instanceof CityNotFound) {
      return res.status(404).json({ error: err.message });
    }
    return res.status(500).json({ error: "Weather API error" });
  }

  try {
    await subscriptionService.subscribe({ email, city, frequency });
    return res.status(200).json({ message: "Subscription successful. Confirmation email sent." });
  } catch (err: unknown) {
    if (err instanceof AlreadySubscribedError) {
      return res.status(409).json({ error: err.message });
    } else if (err instanceof InvalidTokenError) {
      return res.status(400).json({ error: err.message });
    }
    console.error(err);
    return res.status(400).json({ error: "Invalid input" });
  }
});

router.get("/confirm/:token", async (req, res) => {
  const { token } = req.params;
  try {
    const confirmed = await subscriptionService.confirm(token);
    if (confirmed) {
      return res.status(200).send("Subscription confirmed successfully");
    }
    return res.status(400).send("Invalid token");
  } catch (err) {
    if (err instanceof NotConfirmedError) {
      return res.status(400).send(err.message);
    }
    console.error(err);
    return res.status(404).send("Token not found");
  }
});

router.get("/unsubscribe/:token", async (req, res) => {
  const { token } = req.params;
  try {
    const unsubscribed = await subscriptionService.unsubscribe(token);
    if (unsubscribed) {
      return res.status(200).send("Unsubscribed and deleted successfully");
    }
    return res.status(400).send("Invalid token");
  } catch (err) {
    if (err instanceof InvalidTokenError) {
      return res.status(500).send(err.message);
    }
    console.error(err);
    return res.status(500).send("Server error");
  }
});

export default router;
