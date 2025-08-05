import { Request, Response, NextFunction } from "express";
import { Logger } from "winston";
import { metrics } from "../metrics/index.js";
import { randomUUID } from "crypto";

export interface LoggedRequest extends Request {
  requestId: string;
  startTime: number;
}

export function loggingMiddleware(logger: Logger) {
  return (req: Request, res: Response, next: NextFunction) => {
    const loggedReq = req as LoggedRequest;
    loggedReq.requestId = randomUUID();
    loggedReq.startTime = Date.now();

    // Increment active connections
    metrics.activeConnections.inc();

    // Log incoming request
    logger.info("Incoming request", {
      requestId: loggedReq.requestId,
      method: req.method,
      url: req.url,
      userAgent: req.get("user-agent"),
      ip: req.ip,
    });

    // Listen for response finish
    res.on("finish", () => {
      const duration = Date.now() - loggedReq.startTime;
      const route = req.route?.path || req.path;

      // Record metrics
      metrics.httpRequestsTotal.inc({
        method: req.method,
        route,
        status_code: res.statusCode.toString(),
      });

      metrics.httpRequestDuration.observe(
        {
          method: req.method,
          route,
        },
        duration / 1000,
      );

      metrics.activeConnections.dec();

      // Log response
      const logLevel = res.statusCode >= 400 ? "warn" : "info";
      logger.log(logLevel, "Request completed", {
        requestId: loggedReq.requestId,
        method: req.method,
        url: req.url,
        statusCode: res.statusCode,
        duration,
        responseSize: res.get("content-length"),
      });
    });

    next();
  };
}
