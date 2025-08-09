import { Request, Response, NextFunction } from "express";
import { Logger } from "winston";
import { httpRequestsTotal, httpRequestDuration, activeConnections } from "../metrics/index.js";

export interface LoggingMiddlewareOptions {
  logger: Logger;
  includeBody?: boolean;
  includeHeaders?: boolean;
  sensitiveHeaders?: string[];
}

interface RequestWithId extends Request {
  requestId?: string;
}

interface RequestWithId extends Request {
  requestId?: string;
}

export function createLoggingMiddleware(options: LoggingMiddlewareOptions) {
  const {
    logger,
    includeBody = false,
    includeHeaders = false,
    sensitiveHeaders = ["authorization", "cookie", "x-api-key"],
  } = options;

  return (req: RequestWithId, res: Response, next: NextFunction) => {
    const startTime = Date.now();
    const requestId =
      req.headers["x-request-id"] || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Add request ID to request object for use in other parts of the application
    req.requestId = requestId as string;

    // Increment active connections
    activeConnections.inc();

    // Create child logger with request context
    const requestLogger = logger.child({
      requestId,
      method: req.method,
      url: req.url,
      userAgent: req.get("User-Agent"),
      ip: req.ip || req.connection.remoteAddress,
    });

    // Log incoming request
    const requestLogData: Record<string, unknown> = {
      message: `Incoming ${req.method} request to ${req.url}`,
      method: req.method,
      url: req.url,
      query: req.query,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.get("User-Agent"),
    };

    if (includeHeaders) {
      const headers = { ...req.headers };
      // Mask sensitive headers
      sensitiveHeaders.forEach((header) => {
        if (headers[header]) {
          headers[header] = "***MASKED***";
        }
      });
      requestLogData.headers = headers;
    }

    if (includeBody && req.body) {
      requestLogData.body = req.body;
    }

    requestLogger.info(requestLogData);

    // Override res.end to log response
    const originalEnd = res.end.bind(res);
    res.end = function (chunk?: unknown, encoding?: unknown, callback?: unknown) {
      const duration = Date.now() - startTime;
      const statusCode = res.statusCode;

      // Record metrics
      httpRequestsTotal.inc({
        method: req.method,
        route: req.route?.path || req.url,
        status_code: statusCode.toString(),
      });

      httpRequestDuration.observe(
        { method: req.method, route: req.route?.path || req.url },
        duration / 1000,
      );

      // Decrement active connections
      activeConnections.dec();

      // Log response
      const responseLogData = {
        message: `${req.method} ${req.url} - ${statusCode} - ${duration}ms`,
        method: req.method,
        url: req.url,
        statusCode,
        duration,
        contentLength: res.get("Content-Length"),
      };

      // Determine log level based on status code
      if (statusCode >= 500) {
        requestLogger.error(responseLogData);
      } else if (statusCode >= 400) {
        requestLogger.warn(responseLogData);
      } else {
        requestLogger.info(responseLogData);
      }

      // Call the original end function
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return originalEnd(chunk as any, encoding as any, callback as any);
    };

    next();
  };
}

export function createErrorLoggingMiddleware(logger: Logger) {
  return (err: Error, req: RequestWithId, res: Response, next: NextFunction) => {
    const requestId = req.requestId;
    const errorLogger = logger.child({
      requestId,
      method: req.method,
      url: req.url,
      error: err.name,
    });

    errorLogger.error({
      message: `Unhandled error in ${req.method} ${req.url}`,
      error: err.message,
      stack: err.stack,
      method: req.method,
      url: req.url,
      query: req.query,
      body: req.body,
    });

    if (!res.headersSent) {
      res.status(500).json({
        error: "Internal server error",
        requestId,
      });
    }

    next(err);
  };
}
