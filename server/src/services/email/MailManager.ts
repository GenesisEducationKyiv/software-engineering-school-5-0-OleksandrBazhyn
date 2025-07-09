import nodemailer from "nodemailer";
import { WeatherData, Mailer } from "../../types.js";
import { config } from "../../config.js";
import { Logger } from "winston";

class MailManager implements Mailer {
  private transporter: nodemailer.Transporter;
  private logger: Logger;

  constructor(transporter: nodemailer.Transporter, logger: Logger) {
    this.transporter = transporter;
    this.logger = logger;
  }

  async sendConfirmationEmail(email: string, city: string, token: string): Promise<void> {
    this.logger.info(`Sending confirmation email to: ${email}`);
    const link = `http://localhost:3000/api/v1/confirm/${token}`;
    await this.transporter.sendMail({
      from: config.SMTP_FROM,
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
    this.logger.info(`Sending weather email to: ${email} for city: ${city}`);
    await this.transporter.sendMail({
      from: config.SMTP_FROM,
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

export default MailManager;
