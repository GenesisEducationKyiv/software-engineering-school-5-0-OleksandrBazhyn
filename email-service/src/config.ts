import "dotenv/config";

const isTestEnvironment =
  process.env.NODE_ENV === "test" ||
  process.env.JEST_WORKER_ID !== undefined ||
  process.env.CI === "true";

const getTestDefault = (name: string): string => {
  const defaults: Record<string, string> = {
    PORT: "3000",
    SMTP_HOST: "smtp.example.com",
    SMTP_PORT: "587",
    SMTP_USER: "test@example.com",
    SMTP_PASS: "testpassword",
    SMTP_FROM: "noreply@example.com",
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
  SMTP_HOST: required("SMTP_HOST", process.env.SMTP_HOST),
  SMTP_PORT: Number(required("SMTP_PORT", process.env.SMTP_PORT)) || 587,
  SMTP_USER: required("SMTP_USER", process.env.SMTP_USER),
  SMTP_PASS: required("SMTP_PASS", process.env.SMTP_PASS),
  SMTP_FROM: required("SMTP_FROM", process.env.SMTP_FROM),
  REDIS_URL: required("REDIS_URL", process.env.REDIS_URL) || "redis://localhost:6379",
  NODE_ENV: required("NODE_ENV", process.env.NODE_ENV),
  REDIS_ENABLED: process.env.REDIS_ENABLED !== "false" && !isTestEnvironment,
};
