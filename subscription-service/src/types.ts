import * as grpc from "@grpc/grpc-js";

export type SubscriptionFrequency = "daily" | "hourly";

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
  subscribe(subscription: SubscriptionInput): Promise<{ token: string }>;
  confirm(token: string): Promise<boolean>;
  unsubscribe(token: string): Promise<boolean>;
}

export interface DataProvider {
  checkSubscriptionExists(subscription: SubscriptionInput): Promise<boolean>;
  insertSubscription(
    subscription: SubscriptionInput,
    token: string,
    confirmed: boolean,
  ): Promise<void>;
  updateSubscriptionStatus(token: string, confirmed: boolean): Promise<boolean>;
  deleteSubscription(token: string): Promise<boolean>;
  getActiveSubscriptions(): Promise<Subscription[]>;
  getSubscriptionsByFrequency(frequency: SubscriptionFrequency): Promise<Subscription[]>;
}

// Define the proto interfaces based on your weather.proto
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

export interface HealthCheckRequest {
  service: string;
}

export interface HealthCheckResponse {
  status: number; // 0 = NOT_SERVING, 1 = SERVING
}

// Define the service interface
export interface WeatherServiceClient extends grpc.Client {
  GetWeather(
    request: WeatherRequest,
    callback: (error: grpc.ServiceError | null, response: WeatherResponse) => void,
  ): void;

  HealthCheck(
    request: HealthCheckRequest,
    callback: (error: grpc.ServiceError | null, response: HealthCheckResponse) => void,
  ): void;
}

export interface WeatherProtoGrpcObject {
  weather: {
    WeatherService: new (
      address: string,
      credentials: grpc.ChannelCredentials,
    ) => WeatherServiceClient;
  };
}

export interface WeatherData {
  temperature: number;
  description: string;
  humidity: number;
}

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
  sendEmail(request: EmailRequest): Promise<boolean>;
  healthCheck(): Promise<boolean>;
}

export interface WeatherGrpcClientInterface {
  getWeather(city: string): Promise<WeatherData>;
  healthCheck(): Promise<boolean>;
  disconnect(): void;
}

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
