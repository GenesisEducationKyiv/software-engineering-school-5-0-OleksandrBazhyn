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

export interface WeatherProvider {
  getWeatherData: (city: string) => Promise<WeatherData>;
  setNext?: (provider: WeatherProvider) => WeatherProvider;
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

export interface WeatherProviderManagerInterface {
  getProvider(): WeatherProvider;
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

// API Request/Response types
export interface WeatherRequest {
  city: string;
}

export interface ErrorResponse {
  error: string;
}

export interface HealthResponse {
  status: "healthy" | "unhealthy";
  timestamp: string;
  services: {
    cache?: "connected" | "disconnected";
    providers?: string[];
  };
}
