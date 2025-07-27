export interface Mailer {
  sendConfirmationEmail(email: string, city: string, confirmUrl: string): Promise<void>;
  sendWeatherEmail(email: string, weatherData: WeatherData, unsubscribeUrl: string): Promise<void>;
}

export interface WeatherData {
  city: string;
  temperature: number;
  humidity: number;
  description: string;
}

export interface WeatherEmailData {
  to: string;
  weather: WeatherData;
}

export interface ConfirmationPayload {
  email?: string;
  city?: string;
  confirmUrl?: string;
}

export interface WeatherPayload {
  email?: string;
  city?: string;
  temperature?: number | null;
  humidity?: number | null;
  description?: string;
  unsubscribeUrl?: string;
}
