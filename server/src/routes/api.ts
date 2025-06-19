import express from "express";
import WeatherManager from "../managers/WeatherManager.js";
import SubscriptionService from "../managers/SubscriptionService.js";
import { WeatherData, SubscriptionInput } from "../types.js";
import MailManager from "../managers/MailManager.js";
import DbDataProvider from "../managers/DbDataProvider.js";
import nodemailer from "nodemailer";

const router = express.Router();
const subscriptionService = new SubscriptionService(
  new MailManager(
    nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    }),
  ),
  DbDataProvider,
);

router.get("/weather", async (req: express.Request, res: express.Response) => {
  const city = req.query.city as string | undefined;
  if (!city) {
    return res.status(400).json({ error: "Invalid request" });
  }
  try {
    const weatherManager = new WeatherManager();
    const weatherData: WeatherData = await weatherManager.getWeatherData(city);
    if (!weatherData) {
      return res.status(404).json({ error: "City not found" });
    }
    const data = {
      temperature: weatherData.current.temp_c,
      humidity: weatherData.current.humidity,
      description: weatherData.current.condition.text,
    };
    return res.status(200).json(data);
  } catch (error) {
    console.error("Error fetching weather data:", error);
    return res.status(404).json({ error: "City not found" });
  }
});

router.post("/subscribe", async (req: express.Request, res: express.Response) => {
  console.log("Request body:", req.body);
  const { email, city, frequency } = req.body as SubscriptionInput;

  if (!email || !city || !frequency || !["daily", "hourly"].includes(frequency)) {
    return res.status(400).json({ error: "Invalid input" });
  }

  try {
    await subscriptionService.subscribe({ email, city, frequency });
    return res.status(200).json({ message: "Subscription successful. Confirmation email sent." });
  } catch (err: unknown) {
    if (err instanceof Error && err.message === "Email already subscribed") {
      return res.status(409).json({ error: err.message });
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
    console.error(err);
    return res.status(500).send("Server error");
  }
});

export default router;
