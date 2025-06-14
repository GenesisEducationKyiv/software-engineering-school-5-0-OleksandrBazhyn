import "dotenv/config";
import type { Knex } from "knex";

const isProd = process.env.NODE_ENV === "production";
const migrationsDir = isProd ? "./dist/db/migrations" : "./db/migrations";

const config: Knex.Config = {
  client: "pg",
  connection: process.env.DATABASE_URL,
  migrations: {
    directory: migrationsDir,
  },
};

export default config;