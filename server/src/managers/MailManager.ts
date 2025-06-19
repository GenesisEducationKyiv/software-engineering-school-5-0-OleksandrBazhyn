import nodemailer from "nodemailer";
import { WeatherData, Mailer } from "../types.js";

class MailManager implements Mailer {
  private transporter: nodemailer.Transporter;

  constructor(transporter: nodemailer.Transporter) {
    this.transporter = transporter;
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
                    <a href="http://localhost:3000/api/unsubscribe/${token}">
                        Unsubscribe from weather updates
                    </a>
                </p>
            `,
    });
  }
}

export default MailManager;
