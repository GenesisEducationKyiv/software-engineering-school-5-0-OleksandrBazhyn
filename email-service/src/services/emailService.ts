import nodemailer from "nodemailer";
import { Mailer, WeatherData } from "../types.js";
import { Logger } from "winston";
import { config } from "../config.js";
import { HtmlRender } from "./htmlRender.js";
import { metrics } from "../metrics/index.js";

export class EmailService implements Mailer {
  private logger: Logger;
  private transporter: nodemailer.Transporter;
  private htmlRender: HtmlRender;

  constructor(logger: Logger, transporter: nodemailer.Transporter) {
    this.logger = logger.child({ service: "EmailService" });
    this.transporter = transporter;
    this.htmlRender = new HtmlRender();
  }

  async sendConfirmationEmail(email: string, city: string, confirmUrl: string): Promise<void> {
    const timer = metrics.emailProcessingDuration.startTimer({
      type: "confirmation",
      template: "confirmation",
    });

    this.logger.info("Starting confirmation email send", {
      email,
      city,
      template: "confirmation",
    });

    try {
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

      // Success metrics
      metrics.emailsSentTotal.inc({
        type: "confirmation",
        template: "confirmation",
      });

      metrics.confirmationEmailsTotal.inc({ status: "success" });

      this.logger.info("Confirmation email sent successfully", {
        email,
        city,
        template: "confirmation",
      });
    } catch (error) {
      // Error metrics
      metrics.emailsFailedTotal.inc({
        type: "confirmation",
        template: "confirmation",
        error_type: error instanceof Error ? error.constructor.name : "Unknown",
      });

      metrics.confirmationEmailsTotal.inc({ status: "failed" });

      this.logger.error("Failed to send confirmation email", {
        email,
        city,
        template: "confirmation",
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });

      throw error;
    } finally {
      timer();
    }
  }

  async sendWeatherEmail(
    email: string,
    weatherData: WeatherData,
    unsubscribeUrl: string,
  ): Promise<void> {
    const timer = metrics.emailProcessingDuration.startTimer({
      type: "weather",
      template: "weather",
    });

    this.logger.info("Starting weather email send", {
      email,
      city: weatherData.city,
      template: "weather",
      temperature: weatherData.temperature,
      description: weatherData.description,
    });

    try {
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

      // Success metrics
      metrics.emailsSentTotal.inc({
        type: "weather",
        template: "weather",
      });

      metrics.weatherEmailsTotal.inc({
        status: "success",
        city: weatherData.city,
      });

      this.logger.info("Weather email sent successfully", {
        email,
        city: weatherData.city,
        template: "weather",
        temperature: weatherData.temperature,
        description: weatherData.description,
      });
    } catch (error) {
      // Error metrics
      metrics.emailsFailedTotal.inc({
        type: "weather",
        template: "weather",
        error_type: error instanceof Error ? error.constructor.name : "Unknown",
      });

      metrics.weatherEmailsTotal.inc({
        status: "failed",
        city: weatherData.city,
      });

      this.logger.error("Failed to send weather email", {
        email,
        city: weatherData.city,
        template: "weather",
        temperature: weatherData.temperature,
        description: weatherData.description,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });

      throw error;
    } finally {
      timer();
    }
  }
}
