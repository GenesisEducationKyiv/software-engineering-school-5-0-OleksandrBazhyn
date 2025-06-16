import "dotenv/config";
const isProd = process.env.NODE_ENV === "production";
const migrationsDir = "./db/migrations";

const config = {
  client: "pg",
  connection: process.env.DATABASE_URL,
  migrations: {
    directory: migrationsDir,
    extension: isProd ? "js" : "ts",
  },
};

export default config;