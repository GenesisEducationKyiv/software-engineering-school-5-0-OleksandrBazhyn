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
  getSubscriptionByToken(token: string): Promise<Subscription | null>;
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

export interface WeatherRequest {
  city: string;
}

export interface WeatherData {
  temperature: number;
  humidity: number;
  description: string;
  city: string;
  timestamp: number;
}

export interface WeatherResponse {
  success: boolean;
  error_message: string;
  data: WeatherData | null;
}

export interface WeatherBatchRequest {
  cities: string[];
}

export interface WeatherBatchResponse {
  success: boolean;
  error_message: string;
  data: WeatherData[];
}

export interface GrpcHealthRequest {
  service: string;
}

export interface GrpcHealthResponse {
  status: number; // 0=UNKNOWN, 1=SERVING, 2=NOT_SERVING, 3=SERVICE_UNKNOWN
  message?: string;
}

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
    WeatherService: new (
      address: string,
      credentials: grpc.ChannelCredentials,
    ) => WeatherServiceClient;
  };
}

export interface WeatherGrpcClientInterface {
  getWeather(city: string): Promise<WeatherData>;
  healthCheck(): Promise<boolean>;
  disconnect(): void;
}

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

export interface HttpHealthResponse {
  status: string;
  timestamp?: string;
}

export interface EmailServiceResponse {
  message: string;
  messageId?: string;
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
    unsubscribeLink?: string;
  };
}

export interface EmailServiceInterface {
  sendConfirmationEmail(email: string, city: string, confirmUrl: string): Promise<boolean>;
  sendWeatherEmail(
    email: string,
    city: string,
    temperature: number,
    humidity: number,
    description: string,
    unsubscribeUrl: string,
  ): Promise<boolean>;
  sendEmail(request: EmailRequest): Promise<boolean>;
  healthCheck(): Promise<boolean>;
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

export interface MessageBroker {
  publish(topic: string, message: string): Promise<void>;
  subscribe(topic: string, handler: (message: string) => Promise<void>): Promise<void>;
  connect(): Promise<void>;
}
