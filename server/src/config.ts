import "dotenv/config";
const required = (name: string, value: unknown): string => {
  if (value === undefined || value === null) {
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
  WEATHER_API_KEY: required("WEATHER_API_KEY", process.env.WEATHER_API_KEY),
  PGPORT: Number(required("PGPORT", process.env.PGPORT)) || 5432,
  PGDATABASE: required("PGDATABASE", process.env.PGDATABASE),
  PGHOST: required("PGHOST", process.env.PGHOST),
  PGUSER: required("PGUSER", process.env.PGUSER),
  PGPASSWORD: required("PGPASSWORD", process.env.PGPASSWORD),
};
