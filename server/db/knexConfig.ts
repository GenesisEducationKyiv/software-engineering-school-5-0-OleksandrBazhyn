import { config } from "../src/config.js";
const isProd = "production";
const migrationsDir = "./db/migrations";

const config = {
  client: "pg",
  connection: config.DATABASE_URL,
  migrations: {
    directory: migrationsDir,
    extension: isProd ? "js" : "ts",
  },
};

export default config;
