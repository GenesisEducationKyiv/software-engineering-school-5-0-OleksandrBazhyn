import axios, { AxiosInstance, AxiosError } from "axios";
import {
  EmailServiceInterface,
  ConfirmationEmailRequest,
  WeatherEmailRequest,
  HttpHealthResponse,
  EmailServiceResponse,
  EmailRequest,
} from "../types.js";
import { emailsSentTotal } from "../metrics/index.js";
import { config } from "../config.js";
import { Logger } from "winston";

export class EmailServiceClient implements EmailServiceInterface {
  private client: AxiosInstance;
  private baseURL: string;
  private logger: Logger;

  constructor(baseURL: string, logger: Logger) {
    this.baseURL = baseURL;
    this.logger = logger;
    this.client = axios.create({
      baseURL,
      timeout: config.email?.timeout || 10000,
      headers: {
        "Content-Type": "application/json",
        "User-Agent": `subscription-service/${config.NPM_PACKAGE_VERSION}`,
      },
    });

    this.setupInterceptors();
  }

  async sendConfirmationEmail(email: string, city: string, confirmUrl: string): Promise<boolean> {
    const request: ConfirmationEmailRequest = {
      email,
      city,
      confirmUrl,
    };
    return this.sendEmailRequest("/api/v1/emails/send", request, "confirmation");
  }

  async sendWeatherEmail(
    email: string,
    city: string,
    temperature: number,
    humidity: number,
    description: string,
    unsubscribeUrl: string,
  ): Promise<boolean> {
    const request: WeatherEmailRequest = {
      email,
      city,
      temperature,
      humidity,
      description,
      unsubscribeUrl,
    };
    return this.sendEmailRequest("/api/v1/emails/send", request, "weather");
  }

  async sendEmail(request: EmailRequest): Promise<boolean> {
    const startTime = Date.now();

    this.logger.info("Email request received", {
      type: request.type,
      to: this.maskEmail(request.to),
    });

    try {
      let result = false;

      if (request.type === "confirmation") {
        result = await this.sendConfirmationEmail(
          request.to,
          request.data.city || "Unknown",
          request.data.confirmationLink || "#",
        );
      } else if (request.type === "weather-update") {
        result = await this.sendWeatherEmail(
          request.to,
          request.data.city || "Unknown",
          request.data.temperature || 0,
          request.data.humidity || 0,
          request.data.description || "No description",
          "#",
        );
      } else {
        this.logger.error("Unsupported email type", { type: request.type });
        emailsSentTotal.inc({ type: request.type, status: "failed" });
        return false;
      }

      const duration = Date.now() - startTime;
      const status = result ? "success" : "failed";

      emailsSentTotal.inc({ type: request.type, status });

      this.logger.info("Email request completed", {
        type: request.type,
        to: this.maskEmail(request.to),
        status,
        duration,
      });

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      emailsSentTotal.inc({ type: request.type, status: "failed" });

      this.logger.error("Email request failed", {
        type: request.type,
        to: this.maskEmail(request.to),
        duration,
        error: error instanceof Error ? error.message : String(error),
      });

      return false;
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      this.logger.debug("Checking email service health");
      const response = await this.client.get<HttpHealthResponse>("/api/v1/emails/health", {
        timeout: config.health?.timeout || 3000,
      });
      const isHealthy =
        response.status === 200 && response.data?.status === "Email service is healthy";
      if (!isHealthy) {
        this.logger.warn("Email service health check failed", {
          status: response.status,
          responseStatus: response.data?.status,
        });
      }
      return isHealthy;
    } catch (error) {
      this.logger.warn("Email service health check error:", {
        error: error instanceof Error ? error.message : String(error),
        baseURL: this.baseURL,
      });
      return false;
    }
  }

  private async sendEmailRequest(
    endpoint: string,
    request: ConfirmationEmailRequest | WeatherEmailRequest,
    type: string,
  ): Promise<boolean> {
    const validationError = this.validateEmailRequest(request, type);
    if (validationError) {
      this.logger.error("Invalid email request:", {
        error: validationError,
        type,
        email: this.maskEmail(request.email),
      });
      return false;
    }
    try {
      this.logger.info("Sending email request", {
        type,
        email: this.maskEmail(request.email),
        city: request.city,
      });
      const response = await this.client.post<EmailServiceResponse>(endpoint, request);
      if (response.status === 202) {
        this.logger.info("Email queued successfully", {
          type,
          email: this.maskEmail(request.email),
          message: response.data?.message,
        });
        return true;
      }
      this.logger.warn("Email service returned unexpected status", {
        status: response.status,
        message: response.data?.message,
        type,
        email: this.maskEmail(request.email),
      });
      return false;
    } catch (error) {
      this.handleEmailError(error, request, type);
      return false;
    }
  }

  private validateEmailRequest(
    request: ConfirmationEmailRequest | WeatherEmailRequest,
    type: string,
  ): string | null {
    if (!request.email?.trim()) {
      return "Missing or empty email";
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(request.email)) {
      return "Invalid email format";
    }
    if (!request.city?.trim()) {
      return "Missing or empty city";
    }
    if (type === "confirmation") {
      const confirmReq = request as ConfirmationEmailRequest;
      if (!confirmReq.confirmUrl?.trim()) {
        return "Missing confirmation URL";
      }
    }
    if (type === "weather") {
      const weatherReq = request as WeatherEmailRequest;
      if (typeof weatherReq.temperature !== "number") {
        return "Missing or invalid temperature";
      }
      if (typeof weatherReq.humidity !== "number") {
        return "Missing or invalid humidity";
      }
      if (!weatherReq.description?.trim()) {
        return "Missing weather description";
      }
      if (!weatherReq.unsubscribeUrl?.trim()) {
        return "Missing unsubscribe URL";
      }
    }
    return null;
  }

  private handleEmailError(
    error: unknown,
    request: ConfirmationEmailRequest | WeatherEmailRequest,
    type: string,
  ): void {
    const emailMask = this.maskEmail(request.email);
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      switch (axiosError.code) {
        case "ECONNREFUSED":
          this.logger.error("Email service is unavailable", {
            baseURL: this.baseURL,
            type,
            email: emailMask,
          });
          break;
        case "ETIMEDOUT":
          this.logger.error("Email service request timed out", {
            timeout: this.client.defaults.timeout,
            type,
            email: emailMask,
          });
          break;
        default:
          this.logger.error("Email service request failed", {
            status: axiosError.response?.status,
            statusText: axiosError.response?.statusText,
            message: axiosError.message,
            responseData: axiosError.response?.data,
            type,
            email: emailMask,
          });
      }
    } else {
      this.logger.error("Unexpected error sending email", {
        error: error instanceof Error ? error.message : String(error),
        type,
        email: emailMask,
      });
    }
  }

  private maskEmail(email: string): string {
    if (!email || email.length < 5) {
      return "***";
    }
    return email.substring(0, 3) + "***@" + email.split("@")[1];
  }

  private setupInterceptors(): void {
    this.client.interceptors.request.use(
      (config) => {
        this.logger.debug("Email service request", {
          method: config.method?.toUpperCase(),
          url: `${config.baseURL}${config.url}`,
          timestamp: new Date().toISOString(),
        });
        return config;
      },
      (error) => {
        this.logger.error("Email service request setup failed:", error);
        return Promise.reject(error);
      },
    );
    this.client.interceptors.response.use(
      (response) => {
        this.logger.debug("Email service response", {
          status: response.status,
          statusText: response.statusText,
          url: response.config.url,
          timestamp: new Date().toISOString(),
        });
        return response;
      },
      (error) => {
        if (axios.isAxiosError(error)) {
          this.logger.debug("Email service error response", {
            status: error.response?.status,
            statusText: error.response?.statusText,
            url: error.config?.url,
            timestamp: new Date().toISOString(),
          });
        }
        return Promise.reject(error);
      },
    );
  }
}
