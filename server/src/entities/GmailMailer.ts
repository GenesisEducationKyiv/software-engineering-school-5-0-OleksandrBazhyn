import nodemailer from "nodemailer";
import { WeatherData, Mailer } from "../types.js";

class GmailMailer implements Mailer {
  private transporter: nodemailer.Transporter;

  constructor() {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.warn("SMTP_USER or SMTP_PASS is not set in environment variables.");
    }
    this.transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  async sendConfirmationEmail(email: string, city: string, token: string): Promise<void> {
    console.log("Sending confirmation email to:", email);
    const link = `http://localhost:3000/api/confirm/${token}`;
    await this.transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: email,
      subject: "Confirm your subscription",
      html: `<p>Click <a href="${link}">here</a> to confirm your subscription for ${city}</p>`,
    });
  }

  async sendWeatherEmail(
    email: string,
    city: string,
    weather: WeatherData,
    token: string,
  ): Promise<void> {
    console.log("Sending weather email to:", email);
    await this.transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: email,
      subject: `Weather update for ${city}`,
      html: `
                <p>Weather in ${city}:</p>
                <ul>
                    <li>Temperature: ${weather.current.temp_c}°C</li>
                    <li>Humidity: ${weather.current.humidity}%</li>
                    <li>Description: ${weather.current.condition.text}</li>
                </ul>
                <p>
                    <a href="http://localhost:3000/api/v1/unsubscribe/${token}">
                        Unsubscribe from weather updates
                    </a>
                </p>
            `,
    });
  }
}

export default GmailMailer;
