import { createLogger, format, transports } from "winston";

function buildDevLogger() {
  const logFormat = format.printf(
    ({ timestamp, level, message, stack }) => `${timestamp} [${level}]: ${stack || message}`,
  );

  return createLogger({
    level: "debug",
    format: format.combine(
      format.colorize(),
      format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
      format.errors({ stack: true }),
      logFormat,
    ),
    transports: [new transports.Console(), new transports.File({ filename: "../../logs/dev.log" })],
  });
}

export default buildDevLogger;
