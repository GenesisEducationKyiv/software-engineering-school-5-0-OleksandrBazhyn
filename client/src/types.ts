export type WeatherData =
  | {
      temperature: number;
      humidity: number;
      description: string;
    }
  | { error: string }
  | null;

export type WebSocketWeatherData = {
  temperature: number;
  humidity: number;
  description: string;
} | null;

export type Frequency = "daily" | "hourly";

export interface FormState {
  email: string;
  city: string;
  frequency: Frequency;
}
