import "dotenv/config";
const isProd = process.env.NODE_ENV === "production";
const migrationsDir = "./migrations";

const config = {
  client: "pg",
  connection: {
    host: process.env.PGHOST || "localhost",
    user: process.env.PGUSER || "postgres",
    password: process.env.PGPASSWORD || "postgres",
    database: process.env.PGDATABASE || "weather_db",
    port: Number(process.env.PGPORT) || 5432,
  },
  migrations: {
    directory: migrationsDir,
    extension: isProd ? "js" : "ts",
  },
};

export default config;
