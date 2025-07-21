import * as grpc from "@grpc/grpc-js";

export type SubscriptionFrequency = "daily" | "hourly";

// ✅ Subscription types
export interface Subscription {
  id: string;
  email: string;
  city: string;
  frequency: SubscriptionFrequency;
  confirmed: boolean;
  token: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface SubscriptionInput {
  email: string;
  city: string;
  frequency: SubscriptionFrequency;
}

export interface SubscriptionServiceInterface {
  subscribe(subscription: SubscriptionInput): Promise<{ token: string; id: string }>;
  confirm(token: string): Promise<boolean>;
  unsubscribe(token: string): Promise<boolean>;
}

// ✅ Database interface
export interface DataProvider {
  checkSubscriptionExists(subscription: SubscriptionInput): Promise<boolean>;
  insertSubscription(subscription: SubscriptionInput, token: string, confirmed: boolean): Promise<void>;
  updateSubscriptionStatus(token: string, confirmed: boolean): Promise<boolean>;
  deleteSubscription(token: string): Promise<boolean>;
  getActiveSubscriptions(): Promise<Subscription[]>;
  getSubscriptionsByFrequency(frequency: SubscriptionFrequency): Promise<Subscription[]>;
}

// ✅ Validation types
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  field?: string;
}

export interface UnvalidatedSubscriptionInput {
  email?: unknown;
  city?: unknown;
  frequency?: unknown;
  [key: string]: unknown;
}

// ✅ Weather service types (gRPC)
export interface WeatherRequest {
  city: string;
}

export interface WeatherResponseData {
  temperature: number;
  description: string;
  humidity: number;
}

export interface WeatherResponse {
  success: boolean;
  data?: WeatherResponseData;
  error_message?: string;
}

export interface WeatherData {
  temperature: number;
  description: string;
  humidity: number;
}

// ✅ gRPC Health Check (different from HTTP health)
export interface GrpcHealthRequest {
  service: string;
}

export interface GrpcHealthResponse {
  status: number; // 0 = NOT_SERVING, 1 = SERVING
}

// ✅ gRPC service interfaces
export interface WeatherServiceClient extends grpc.Client {
  GetWeather(
    request: WeatherRequest,
    callback: (error: grpc.ServiceError | null, response: WeatherResponse) => void,
  ): void;

  HealthCheck(
    request: GrpcHealthRequest,
    callback: (error: grpc.ServiceError | null, response: GrpcHealthResponse) => void,
  ): void;
}

export interface WeatherProtoGrpcObject {
  weather: {
    WeatherService: new (address: string, credentials: grpc.ChannelCredentials) => WeatherServiceClient;
  };
}

export interface WeatherGrpcClientInterface {
  getWeather(city: string): Promise<WeatherData>;
  healthCheck(): Promise<boolean>;
  disconnect(): void;
}

// ✅ Email service types (HTTP)
export interface ConfirmationEmailRequest {
  email: string;
  city: string;
  confirmUrl: string;
}

export interface WeatherEmailRequest {
  email: string;
  city: string;
  temperature: number;
  humidity: number;
  description: string;
  unsubscribeUrl: string;
}

// ✅ HTTP responses
export interface HttpHealthResponse {
  status: string; // "Email service is healthy" etc.
  timestamp?: string;
}

export interface EmailServiceResponse {
  message: string;
  messageId?: string;
}

// ✅ Legacy email interface (for backward compatibility)
export interface EmailRequest {
  to: string;
  subject: string;
  type: "confirmation" | "weather-update";
  data: {
    confirmationLink?: string;
    city?: string;
    temperature?: number;
    description?: string;
    humidity?: number;
  };
}

export interface EmailServiceInterface {
  // Modern specific methods
  sendConfirmationEmail(email: string, city: string, confirmUrl: string): Promise<boolean>;
  sendWeatherEmail(
    email: string,
    city: string,
    temperature: number,
    humidity: number,
    description: string,
    unsubscribeUrl: string
  ): Promise<boolean>;
  
  // Legacy generic method
  sendEmail(request: EmailRequest): Promise<boolean>;
  healthCheck(): Promise<boolean>;
}

// ✅ Health check types (unified)
export interface ServiceHealthStatus {
  status: "up" | "down" | "unknown";
  responseTime?: number;
  error?: string;
  lastCheck: string;
}

export interface HealthResponse {
  service: string;
  status: "healthy" | "degraded" | "error";
  services: {
    weather: ServiceHealthStatus;
    email: ServiceHealthStatus;
  };
  timestamp: string;
}
