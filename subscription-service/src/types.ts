export type SubscriptionFrequency = "daily" | "hourly";

export interface Subscription {
  id: number;
  email: string;
  city: string;
  token: string;
  is_active: boolean;
  frequency: SubscriptionFrequency;
  created_at?: string;
  updated_at?: string;
}

export interface WeatherData {
  current: {
    temp_c: number;
    humidity: number;
    condition: { text: string };
  };
}

export interface WeatherResponse {
  temperature: number;
  humidity: number;
  description: string;
}

export interface SubscriptionInput {
  email: string;
  city: string;
  frequency: SubscriptionFrequency;
}

export interface DataProvider {
  getSubscriptionsByFrequency: (frequency: SubscriptionFrequency) => Promise<Subscription[]>;
  checkSubscriptionExists: (subscription: SubscriptionInput) => Promise<boolean>;
  insertSubscription: (
    subscription: SubscriptionInput,
    token: string,
    is_active?: boolean,
  ) => Promise<void>;
  updateSubscriptionStatus: (token: string, isActive: boolean) => Promise<boolean>;
  deleteSubscription: (token: string) => Promise<boolean>;
}

export interface SubscriptionServiceInterface {
  subscribe: (subscription: SubscriptionInput) => Promise<{ token: string }>;
  confirm: (token: string) => Promise<boolean>;
  unsubscribe: (token: string) => Promise<boolean>;
}

export interface WeatherServiceClient {
  getWeatherData(city: string): Promise<WeatherData | null>;
}

export interface EmailServiceClient {
  sendConfirmationEmail(email: string, city: string, token: string): Promise<void>;
  sendWeatherEmail(email: string, city: string, weather: WeatherData, token: string): Promise<void>;
}

export interface SchedulerServiceInterface {
  start(): void;
  stop(): void;
}
