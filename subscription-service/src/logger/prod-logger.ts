import { createLogger, format, transports } from "winston";
import { SamplingFormat } from "./sampling-format.js";

function buildProdLogger() {
  const structuredFormat = format.printf(
    ({
      timestamp,
      level,
      message,
      service,
      stack,
      requestId,
      email,
      duration,
      error,
      metadata,
    }) => {
      const logEntry = {
        timestamp,
        level,
        message: stack || message,
        service,
        requestId,
        email:
          email && typeof email === "string"
            ? email.replace(/(.{3}).*(@.*)/, "$1***$2")
            : undefined,
        duration,
        error,
        metadata,
        environment: "production",
      };
      return JSON.stringify(logEntry);
    },
  );

  return createLogger({
    level: "info",
    format: format.combine(
      format.timestamp(),
      format.errors({ stack: true }),
      new SamplingFormat({
        sampleRate: 0.1, // 10% sampling for info/debug, 100% for warn/error
        levels: ["info", "debug"],
        highVolumePatterns: [
          "health check",
          "heartbeat",
          "ping",
          "metrics scraped",
          "scheduled job",
        ],
        criticalPatterns: [
          "database connection",
          "authentication failed",
          "payment",
          "security",
          "crash",
          "out of memory",
        ],
      }),
    ),
    transports: [
      new transports.Console({
        format: structuredFormat,
      }),
      new transports.File({
        filename: "logs/prod.log",
        format: structuredFormat,
      }),
      new transports.File({
        filename: "logs/prod-error.log",
        level: "error",
        format: structuredFormat,
      }),
      new transports.File({
        filename: "logs/prod-warn.log",
        level: "warn",
        format: structuredFormat,
      }),
    ],
  });
}

export default buildProdLogger;
