import { config as appConfig } from "../src/config.js";
const isProd = "production";
const migrationsDir = "./migrations";

const knexConfig = {
  client: "pg",
  connection: {
    host: appConfig.PGHOST || "localhost",
    user: appConfig.PGUSER || "postgres",
    password: appConfig.PGPASSWORD || "postgres",
    database: appConfig.PGDATABASE || "weather_db",
    port: appConfig.PGPORT || 5432,
  },
  migrations: {
    directory: migrationsDir,
    extension: isProd ? "js" : "ts",
  },
};

export default knexConfig;
