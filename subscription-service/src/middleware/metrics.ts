import { Request, Response, NextFunction } from "express";
import { httpRequestsTotal, httpRequestDuration } from "../metrics/index.js";
import { createLogger } from "../logger/index.js";

const logger = createLogger("http-metrics");

export function metricsMiddleware(req: Request, res: Response, next: NextFunction): void {
  const startTime = Date.now();
  const route = req.route?.path || req.path || "unknown";
  const method = req.method;

  logger.info("HTTP request started", {
    method,
    route,
    userAgent: req.get("User-Agent"),
    ip: req.ip,
    requestId: req.headers["x-request-id"] || "unknown",
  });

  res.on("finish", () => {
    const duration = (Date.now() - startTime) / 1000;
    const statusCode = res.statusCode.toString();

    httpRequestsTotal.inc({ method, route, status_code: statusCode });
    httpRequestDuration.observe({ method, route, status_code: statusCode }, duration);

    const logLevel = statusCode.startsWith("5")
      ? "error"
      : statusCode.startsWith("4")
        ? "warn"
        : "info";

    logger.log(logLevel, "HTTP request completed", {
      method,
      route,
      statusCode,
      duration: Math.round(duration * 1000),
      requestId: req.headers["x-request-id"] || "unknown",
    });
  });

  next();
}

export function metricsEndpoint(req: Request, res: Response): void {
  import("../metrics/index.js")
    .then(({ register }) => {
      res.set("Content-Type", register.contentType);
      res.end(register.metrics());
    })
    .catch((error) => {
      logger.error("Failed to generate metrics", { error: error.message });
      res.status(500).json({ error: "Failed to generate metrics" });
    });
}
