import { createLogger, format, transports } from "winston";

function buildDevLogger() {
  const logFormat = format.printf(({ timestamp, level, message, service, stack }) => {
    const serviceInfo = service ? `[${service}] ` : "";
    return `${timestamp} [${level}]: ${serviceInfo}${stack || message}`;
  });

  const fileLogFormat = format.printf(({ timestamp, level, message, service, stack }) => {
    const serviceInfo = service ? `[${service}] ` : "";
    return `${timestamp} [${level}]: ${serviceInfo}${stack || message}`;
  });

  return createLogger({
    level: "debug",
    format: format.combine(
      format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
      format.errors({ stack: true }),
    ),
    transports: [
      new transports.Console({
        format: format.combine(format.colorize(), logFormat),
      }),
      new transports.File({
        filename: "logs/dev.log",
        format: fileLogFormat,
      }),
    ],
  });
}

export default buildDevLogger;
