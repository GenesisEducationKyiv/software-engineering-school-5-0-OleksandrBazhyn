import axios, { AxiosInstance } from "axios";
import { logger } from "../logger";

export interface EmailRequest {
  to: string;
  subject: string;
  type: "weather" | "confirmation" | "unsubscribe";
  data: {
    weatherData?: {
      city: string;
      temperature: number;
      description: string;
      humidity: number;
      windSpeed: number;
      pressure: number;
    };
    confirmationLink?: string;
    unsubscribeLink?: string;
  };
}

export class EmailServiceClient {
  private httpClient: AxiosInstance;
  private baseUrl: string;

  constructor(emailServiceUrl = "http://localhost:3003") {
    this.baseUrl = emailServiceUrl;
    this.httpClient = axios.create({
      baseURL: emailServiceUrl,
      timeout: 10000, // 10 second timeout
      headers: {
        "Content-Type": "application/json",
      },
    });

    // Add request interceptor for logging
    this.httpClient.interceptors.request.use(
      (config) => {
        logger.debug("Email service request:", {
          method: config.method,
          url: config.url,
        });
        return config;
      },
      (error) => {
        logger.error("Email service request error:", error);
        return Promise.reject(error);
      },
    );

    // Add response interceptor for logging
    this.httpClient.interceptors.response.use(
      (response) => {
        logger.debug("Email service response:", {
          status: response.status,
          url: response.config.url,
        });
        return response;
      },
      (error) => {
        logger.error("Email service response error:", {
          status: error.response?.status,
          message: error.message,
          url: error.config?.url,
        });
        return Promise.reject(error);
      },
    );
  }

  async sendEmail(emailRequest: EmailRequest): Promise<boolean> {
    try {
      const response = await this.httpClient.post("/api/email/send", emailRequest);
      logger.info("Email queued successfully:", {
        to: emailRequest.to,
        type: emailRequest.type,
      });
      return response.status === 200 || response.status === 202;
    } catch (error) {
      logger.error("Failed to queue email:", {
        to: emailRequest.to,
        type: emailRequest.type,
        error: error instanceof Error ? error.message : "Unknown error",
      });
      return false;
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.httpClient.get("/health");
      return response.status === 200;
    } catch (error) {
      logger.error("Email service health check failed:", error);
      return false;
    }
  }
}
