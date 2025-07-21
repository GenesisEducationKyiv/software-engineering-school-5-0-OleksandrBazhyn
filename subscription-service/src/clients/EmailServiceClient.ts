import axios, { AxiosInstance, AxiosError } from "axios";
import {
  EmailServiceInterface,
  ConfirmationEmailRequest,
  WeatherEmailRequest,
  HttpHealthResponse,        // ✅ Specific HTTP health type
  EmailServiceResponse,      // ✅ Unified response type
  EmailRequest,              // ✅ Legacy compatibility
} from "../types.js";
import { createLogger } from "../logger/index.js";
import { config } from "../config.js";

export class EmailServiceClient implements EmailServiceInterface {
  private client: AxiosInstance;
  private logger = createLogger("EmailServiceClient");

  constructor(private baseURL: string) {
    this.client = axios.create({
      baseURL,
      timeout: config.email?.timeout || 10000,
      headers: {
        "Content-Type": "application/json",
        "User-Agent": `${config.SERVICE_NAME}/${config.SERVICE_VERSION}`,
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
    unsubscribeUrl: string
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

  // ✅ Legacy compatibility method
  async sendEmail(request: EmailRequest): Promise<boolean> {
    if (request.type === "confirmation") {
      return this.sendConfirmationEmail(
        request.to,
        request.data.city || "Unknown",
        request.data.confirmationLink || "#"
      );
    } 
    
    if (request.type === "weather-update") {
      return this.sendWeatherEmail(
        request.to,
        request.data.city || "Unknown",
        request.data.temperature || 0,
        request.data.humidity || 0,
        request.data.description || "No description",
        "#" // unsubscribe URL not in legacy format
      );
    }

    this.logger.error("Unsupported email type:", request.type);
    return false;
  }

  async healthCheck(): Promise<boolean> {
    try {
      this.logger.debug("Performing health check on email service");
      
      // ✅ Use specific HTTP health response type
      const response = await this.client.get<HttpHealthResponse>("/api/v1/emails/health", {
        timeout: config.health?.timeout || 3000,
      });

      const isHealthy = response.status === 200 && 
                       response.data?.status === "Email service is healthy";

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
    type: string
  ): Promise<boolean> {
    // Validate request
    const validationError = this.validateEmailRequest(request, type);
    if (validationError) {
      this.logger.error("Invalid email request:", {
        error: validationError,
        type,
        email: request.email?.substring(0, 5) + "***",
      });
      return false;
    }

    try {
      this.logger.info("Sending email", {
        type,
        email: request.email.substring(0, 5) + "***",
        city: request.city,
      });

      const response = await this.client.post<EmailServiceResponse>(endpoint, request);

      // ✅ Email service returns 202 for queued emails
      if (response.status === 202) {
        this.logger.info("Email queued successfully", {
          type,
          email: request.email.substring(0, 5) + "***",
          message: response.data?.message,
        });
        return true;
      }

      this.logger.warn("Email service returned unexpected status", {
        status: response.status,
        message: response.data?.message,
        type,
      });
      return false;

    } catch (error) {
      this.handleEmailError(error, request, type);
      return false;
    }
  }

  private validateEmailRequest(
    request: ConfirmationEmailRequest | WeatherEmailRequest,
    type: string
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
      if (weatherReq.temperature === null || weatherReq.temperature === undefined) {
        return "Missing temperature";
      }
      if (weatherReq.humidity === null || weatherReq.humidity === undefined) {
        return "Missing humidity";
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
    type: string
  ): void {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      
      if (axiosError.code === 'ECONNREFUSED') {
        this.logger.error("Email service is not available", {
          baseURL: this.baseURL,
          type,
          email: request.email.substring(0, 5) + "***",
        });
      } else if (axiosError.code === 'ETIMEDOUT') {
        this.logger.error("Email service request timed out", {
          timeout: this.client.defaults.timeout,
          type,
          email: request.email.substring(0, 5) + "***",
        });
      } else {
        this.logger.error("Email service request failed", {
          status: axiosError.response?.status,
          statusText: axiosError.response?.statusText,
          message: axiosError.message,
          responseData: axiosError.response?.data,
          type,
          email: request.email.substring(0, 5) + "***",
        });
      }
    } else {
      this.logger.error("Unexpected error sending email", {
        error: error instanceof Error ? error.message : String(error),
        type,
        email: request.email.substring(0, 5) + "***",
      });
    }
  }

  private setupInterceptors(): void {
    this.client.interceptors.request.use(
      (config) => {
        this.logger.debug("Email service request", {
          method: config.method?.toUpperCase(),
          url: `${config.baseURL}${config.url}`,
        });
        return config;
      }
    );

    this.client.interceptors.response.use(
      (response) => {
        this.logger.debug("Email service response", {
          status: response.status,
          url: response.config.url,
        });
        return response;
      },
      (error) => {
        if (axios.isAxiosError(error)) {
          this.logger.debug("Email service error response", {
            status: error.response?.status,
            url: error.config?.url,
          });
        }
        return Promise.reject(error);
      }
    );
  }
}
