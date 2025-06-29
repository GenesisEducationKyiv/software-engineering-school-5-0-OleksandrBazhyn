require("dotenv/config");

const baseConfig = {
  client: "pg",
  connection: {
    host: process.env.PGHOST,
    user: process.env.PGUSER,
    password: process.env.PGPASSWORD,
    database: process.env.PGDATABASE,
    port: process.env.PGPORT,
  },
  migrations: {
    directory: "./db/migrations",
    extension: "cjs",
  },
};

module.exports = {
  development: baseConfig,
  production: baseConfig,
  test: baseConfig,
};
