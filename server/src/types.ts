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

export interface SubscriptionMessage {
  city?: string;
  [key: string]: unknown;
}

export interface WebSocketMessage {
  type: "weather";
  data: {
    temperature: number;
    humidity: number;
    description: string;
  } | null;
}

export interface WebSocketErrorMessage {
  type: "error";
  message: string;
}

export interface WebSocketInfoMessage {
  type: "info";
  message: string;
}

export interface Mailer {
  sendConfirmationEmail: (email: string, city: string, token: string) => Promise<void>;
  sendWeatherEmail: (
    email: string,
    city: string,
    weather: WeatherData,
    token: string,
  ) => Promise<void>;
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

export interface WeatherProvider {
  getWeatherData: (city: string) => Promise<WeatherData>;
}
