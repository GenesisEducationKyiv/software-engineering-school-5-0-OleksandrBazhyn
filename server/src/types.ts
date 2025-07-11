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

export interface GeocodingResult {
  lat: number;
  lon: number;
}

export interface CacheService<T> {
  get(key: string): Promise<T | null>;
  set(key: string, value: T, ttl?: number): Promise<void>;
  invalidate(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
  setDefaultTTL(ttl: number): void;
  getDefaultTTL(): number;
}

export type WeatherCacheServiceInterface = CacheService<WeatherData>;

export interface RedisClientInterface {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttl?: number): Promise<void>;
  del(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
  isConnected(): boolean;
}

export interface CacheMetricsInterface {
  recordHit(cacheType: string, keyPrefix: string): void;
  recordMiss(cacheType: string, keyPrefix: string): void;
  recordError(cacheType: string, operation: string): void;
  recordOperationDuration(cacheType: string, operation: string, duration: number): void;
  getMetrics(): Promise<string>;
}

export interface AppServicesInterface {
  weatherManager: WeatherProviderManagerInterface;
  subscriptionService: SubscriptionServiceInterface;
  redisClient: RedisClientInterface | null;
}

export interface SubscriptionServiceInterface {
  subscribe(subscription: SubscriptionInput): Promise<{ token: string }>;
  confirm(token: string): Promise<boolean>;
  unsubscribe(token: string): Promise<boolean>;
}

export interface WeatherProviderManagerInterface {
  getWeatherData(city: string): Promise<WeatherData | null>;
}

// OpenWeatherMap API types
export interface OpenWeatherMapLocalNames {
  [languageCode: string]: string;
}

export interface OpenWeatherMapGeocodingResponse {
  name: string;
  local_names?: OpenWeatherMapLocalNames;
  lat: number;
  lon: number;
  country: string;
  state?: string;
}

export interface OpenWeatherMapWeatherCondition {
  id: number;
  main: string;
  description: string;
  icon: string;
}

export interface OpenWeatherMapMain {
  temp: number;
  feels_like: number;
  temp_min: number;
  temp_max: number;
  pressure: number;
  humidity: number;
  sea_level?: number;
  grnd_level?: number;
}

export interface OpenWeatherMapWind {
  speed: number;
  deg: number;
  gust?: number;
}

export interface OpenWeatherMapClouds {
  all: number;
}

export interface OpenWeatherMapRain {
  "1h"?: number;
  "3h"?: number;
}

export interface OpenWeatherMapSnow {
  "1h"?: number;
  "3h"?: number;
}

export interface OpenWeatherMapSys {
  type: number;
  id: number;
  country: string;
  sunrise: number;
  sunset: number;
}

export interface OpenWeatherMapCoord {
  lon: number;
  lat: number;
}

export interface OpenWeatherMapWeatherResponse {
  coord: OpenWeatherMapCoord;
  weather: OpenWeatherMapWeatherCondition[];
  base: string;
  main: OpenWeatherMapMain;
  visibility: number;
  wind?: OpenWeatherMapWind;
  rain?: OpenWeatherMapRain;
  snow?: OpenWeatherMapSnow;
  clouds: OpenWeatherMapClouds;
  dt: number;
  sys: OpenWeatherMapSys;
  timezone: number;
  id: number;
  name: string;
  cod: number;
}

export interface ParsedMetrics {
  cache_hits_total?: number;
  cache_misses_total?: number;
  cache_errors_total?: number;
  avg_get_time?: number;
  avg_set_time?: number;
}

export interface MetricsData {
  hits: number;
  misses: number;
  errors: number;
  avgGetTime: number;
  avgSetTime: number;
  totalOperations: number;
  hitRate: number;
  errorRate: number;
}
