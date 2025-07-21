import axios, { AxiosInstance } from "axios";
import type { Logger } from "winston";
import { EmailRequest, EmailServiceInterface } from "../types.js";

export class EmailServiceClient implements EmailServiceInterface {
  private client: AxiosInstance;
  private logger: Logger;

  constructor(
    private baseURL: string,
    logger: Logger,
  ) {
    this.logger = logger;
    this.client = axios.create({
      baseURL,
      timeout: 10000,
      headers: {
        "Content-Type": "application/json",
      },
    });
  }

  async sendEmail(request: EmailRequest): Promise<boolean> {
    if (!request.to || !request.subject || !request.type) {
      this.logger.error("Invalid email request - missing required fields");
      return false;
    }

    try {
      const response = await this.client.post("/api/email/send", request);

      if (response.status === 200) {
        this.logger.info(`Email sent successfully to ${request.to}`);
        return true;
      }
      this.logger.warn(`Email service returned status ${response.status}`);
      return false;
    } catch (error) {
      this.logger.error("Failed to send email:", {
        to: request.to,
        type: request.type,
        error: error instanceof Error ? error.message : error,
      });
      return false;
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.client.get("/health");
      return response.status === 200;
    } catch (error) {
      this.logger.error("Health check failed:", error);
      return false;
    }
  }
}
