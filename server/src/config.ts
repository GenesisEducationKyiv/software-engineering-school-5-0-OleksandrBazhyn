const required = (name: string, value: unknown): string => {
  if (value === undefined || value === null) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value as string;
};
export const config = {
  PORT: Number(required("PORT", process.env.PORT)) || 3000,
  SMTP_USER: required("SMTP_USER", process.env.SMTP_USER),
  SMTP_PASS: required("SMTP_PASS", process.env.SMTP_PASS),
  SMTP_FROM: required("SMTP_FROM", process.env.SMTP_FROM),
  WEATHER_API_KEY: required("WEATHER_API_KEY", process.env.WEATHER_API_KEY),
  DB_URL: required("DB_URL", process.env.DB_URL),
};
