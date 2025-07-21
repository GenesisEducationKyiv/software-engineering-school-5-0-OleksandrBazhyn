import "dotenv/config";

const isTestEnvironment =
  process.env.NODE_ENV === "test" ||
  process.env.JEST_WORKER_ID !== undefined ||
  process.env.CI === "true";

const getTestDefault = (name: string): string => {
  const defaults: Record<string, string> = {
    PORT: "3000",
    PGPORT: "5432",
    PGDATABASE: "weather_db",
    PGHOST: "localhost",
    PGUSER: "postgres",
    PGPASSWORD: "postgres",
    REDIS_URL: "redis://localhost:6379",
    REDIS_ENABLED: "true",
    NODE_ENV: "test",
    WEATHER_SERVICE_URL: "http://localhost:3001",
    EMAIL_SERVICE_URL: "http://localhost:3002",
    NPM_PACKAGE_VERSION: "0.0.0",
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
  PGPORT: Number(required("PGPORT", process.env.PGPORT)) || 5432,
  PGDATABASE: required("PGDATABASE", process.env.PGDATABASE),
  PGHOST: required("PGHOST", process.env.PGHOST),
  PGUSER: required("PGUSER", process.env.PGUSER),
  PGPASSWORD: required("PGPASSWORD", process.env.PGPASSWORD),
  REDIS_URL: required("REDIS_URL", process.env.REDIS_URL) || "redis://localhost:6379",
  NODE_ENV: required("NODE_ENV", process.env.NODE_ENV),
  REDIS_ENABLED: process.env.REDIS_ENABLED !== "false" && !isTestEnvironment,
  WEATHER_SERVICE_URL: required("WEATHER_SERVICE_URL", process.env.WEATHER_SERVICE_URL),
  EMAIL_SERVICE_URL: required("EMAIL_SERVICE_URL", process.env.EMAIL_SERVICE_URL),
  NPM_PACKAGE_VERSION: required("NPM_PACKAGE_VERSION", process.env.npm_package_version),
};
