import nodemailer from "nodemailer";
import { Mailer, WeatherData } from "../types.js";
import { Logger } from "winston";
import { config } from "../config.js";
import { HtmlRender } from "./htmlRender.js";

export class EmailService implements Mailer {
  private logger: Logger;
  private transporter: nodemailer.Transporter;
  private htmlRender: HtmlRender;

  constructor(logger: Logger, transporter: nodemailer.Transporter) {
    this.logger = logger;
    this.transporter = transporter;
    this.htmlRender = new HtmlRender();
  }

  async sendConfirmationEmail(email: string, city: string, confirmUrl: string): Promise<void> {
    this.logger.info(`Sending confirmation email to ${email} for city ${city}`);
    const html = await this.htmlRender.render("confirmation", {
      city,
      confirmUrl,
    });
    await this.transporter.sendMail({
      from: config.SMTP_FROM,
      to: email,
      subject: `Confirm your subscription for ${city}`,
      html,
    });
  }

  async sendWeatherEmail(
    email: string,
    weatherData: WeatherData,
    unsubscribeUrl: string,
  ): Promise<void> {
    this.logger.info(`Sending weather email to ${email} for city ${weatherData.city}`);
    const html = await this.htmlRender.render("weather", {
      ...weatherData,
      unsubscribeUrl,
    });
    await this.transporter.sendMail({
      from: config.SMTP_FROM,
      to: email,
      subject: `Weather update for ${weatherData.city}`,
      html,
    });
  }
}
