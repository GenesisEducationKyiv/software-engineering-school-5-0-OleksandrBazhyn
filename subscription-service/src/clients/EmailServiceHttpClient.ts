import type { EmailServiceClient, WeatherData } from "../types.js";
import { config } from "../config.js";

class EmailServiceHttpClient implements EmailServiceClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = config.EMAIL_SERVICE_URL;
  }

  async sendConfirmationEmail(email: string, city: string, token: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/email/confirmation`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          city,
          token,
        }),
      });

      if (!response.ok) {
        throw new Error(`Email service error: ${response.status}`);
      }
    } catch (error) {
      throw new Error(`Failed to send confirmation email: ${error}`);
    }
  }

  async sendWeatherEmail(
    email: string,
    city: string,
    weather: WeatherData,
    token: string,
  ): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/email/weather`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          city,
          weather,
          token,
        }),
      });

      if (!response.ok) {
        throw new Error(`Email service error: ${response.status}`);
      }
    } catch (error) {
      throw new Error(`Failed to send weather email: ${error}`);
    }
  }
}

export default EmailServiceHttpClient;
