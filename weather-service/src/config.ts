import "dotenv/config";

const isTestEnvironment =
  process.env.NODE_ENV === "test" ||
  process.env.JEST_WORKER_ID !== undefined ||
  process.env.CI === "true";

const getTestDefault = (name: string): string => {
  const defaults: Record<string, string> = {
    PORT: "3000",
    WEATHER_API_KEY: "test-api-key",
    OPENWEATHERMAP_API_KEY: "test-openweather-key",
    REDIS_URL: "redis://localhost:6379",
    REDIS_ENABLED: "true",
    NODE_ENV: "test",
  };

  return defaults[name] || "mock-value";
};

const required = (name: string, value: unknown): string => {
  if (value === undefined || value === null) {
    if (isTestEnvironment) {
      console.warn(`Using default test value for ${name}`);
      return getTestDefault(name);
    }
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value as string;
};

export const config = {
  PORT: Number(required("PORT", process.env.PORT)) || 3000,
  WEATHER_API_KEY: required("WEATHER_API_KEY", process.env.WEATHER_API_KEY),
  OPENWEATHERMAP_API_KEY: required("OPENWEATHERMAP_API_KEY", process.env.OPENWEATHERMAP_API_KEY),
  REDIS_URL: required("REDIS_URL", process.env.REDIS_URL) || "redis://localhost:6379",
  NODE_ENV: required("NODE_ENV", process.env.NODE_ENV),
  REDIS_ENABLED: process.env.REDIS_ENABLED !== "false" && !isTestEnvironment,
};
