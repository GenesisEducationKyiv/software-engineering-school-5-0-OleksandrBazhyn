import { createLogger, format, transports } from "winston";
import { SamplingFormat } from "./sampling-format.js";

function buildDevLogger() {
  const logFormat = format.printf(
    ({ timestamp, level, message, service, stack, requestId, email, duration, error }) => {
      const serviceInfo = service ? `[${service}] ` : "";
      const requestInfo = requestId ? `[${requestId}] ` : "";
      const emailInfo =
        email && typeof email === "string"
          ? `[email: ${email.replace(/(.{3}).*(@.*)/, "$1***$2")}] `
          : "";
      const durationInfo = duration ? `[${duration}ms] ` : "";
      const errorInfo = error ? `[error: ${error}] ` : "";

      return `${timestamp} [${level}]: ${serviceInfo}${requestInfo}${emailInfo}${durationInfo}${errorInfo}${stack || message}`;
    },
  );

  const fileLogFormat = format.printf(
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
      };
      return JSON.stringify(logEntry);
    },
  );

  return createLogger({
    level: "debug",
    format: format.combine(
      format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
      format.errors({ stack: true }),
      new SamplingFormat({ sampleRate: 1.0 }), // 100% sampling in dev
    ),
    transports: [
      new transports.Console({
        format: format.combine(format.colorize(), logFormat),
      }),
      new transports.File({
        filename: "logs/dev.log",
        format: fileLogFormat,
      }),
      new transports.File({
        filename: "logs/dev-error.log",
        level: "error",
        format: fileLogFormat,
      }),
    ],
  });
}

export default buildDevLogger;
