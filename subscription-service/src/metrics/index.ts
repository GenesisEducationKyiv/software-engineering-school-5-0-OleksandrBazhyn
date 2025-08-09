import client from "prom-client";

// Створюємо реєстр метрик
export const register = new client.Registry();

// Додаємо стандартні метрики Node.js
client.collectDefaultMetrics({ register });

// HTTP метрики
export const httpRequestsTotal = new client.Counter({
  name: "http_requests_total",
  help: "Total number of HTTP requests",
  labelNames: ["method", "route", "status_code"],
});

export const httpRequestDuration = new client.Histogram({
  name: "http_request_duration_seconds",
  help: "Duration of HTTP requests in seconds",
  labelNames: ["method", "route", "status_code"],
  buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10],
});

// Метрики бізнес-логіки
export const subscriptionsTotal = new client.Counter({
  name: "subscriptions_total",
  help: "Total number of subscription attempts",
  labelNames: ["status", "city"],
});

export const subscriptionConfirmationsTotal = new client.Counter({
  name: "subscription_confirmations_total",
  help: "Total number of subscription confirmations",
  labelNames: ["status"],
});

export const emailsSentTotal = new client.Counter({
  name: "emails_sent_total",
  help: "Total number of emails sent",
  labelNames: ["type", "status"],
});

export const weatherRequestsTotal = new client.Counter({
  name: "weather_requests_total",
  help: "Total number of weather API requests",
  labelNames: ["status", "city"],
});

export const weatherRequestDuration = new client.Histogram({
  name: "weather_request_duration_seconds",
  help: "Duration of weather API requests in seconds",
  labelNames: ["status", "city"],
  buckets: [0.1, 0.5, 1, 2, 5, 10],
});

// Метрики бази даних
export const dbConnectionsActive = new client.Gauge({
  name: "db_connections_active",
  help: "Number of active database connections",
});

export const dbQueriesTotal = new client.Counter({
  name: "db_queries_total",
  help: "Total number of database queries",
  labelNames: ["operation", "table", "status"],
});

export const dbQueryDuration = new client.Histogram({
  name: "db_query_duration_seconds",
  help: "Duration of database queries in seconds",
  labelNames: ["operation", "table"],
  buckets: [0.01, 0.05, 0.1, 0.3, 0.5, 1, 2],
});

// Метрики Redis
export const redisOperationsTotal = new client.Counter({
  name: "redis_operations_total",
  help: "Total number of Redis operations",
  labelNames: ["operation", "status"],
});

export const redisOperationDuration = new client.Histogram({
  name: "redis_operation_duration_seconds",
  help: "Duration of Redis operations in seconds",
  labelNames: ["operation"],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1],
});

// Метрики планувальника
export const scheduledJobsTotal = new client.Counter({
  name: "scheduled_jobs_total",
  help: "Total number of scheduled job executions",
  labelNames: ["job_type", "status"],
});

export const scheduledJobDuration = new client.Histogram({
  name: "scheduled_job_duration_seconds",
  help: "Duration of scheduled jobs in seconds",
  labelNames: ["job_type"],
  buckets: [1, 5, 10, 30, 60, 300, 600],
});

// Метрики логування
export const logsTotal = new client.Counter({
  name: "logs_total",
  help: "Total number of log entries",
  labelNames: ["level", "service"],
});

export const logsSampled = new client.Counter({
  name: "logs_sampled_total",
  help: "Total number of sampled (filtered) log entries",
  labelNames: ["level", "service"],
});

// Реєструємо всі метрики
register.registerMetric(httpRequestsTotal);
register.registerMetric(httpRequestDuration);
register.registerMetric(subscriptionsTotal);
register.registerMetric(subscriptionConfirmationsTotal);
register.registerMetric(emailsSentTotal);
register.registerMetric(weatherRequestsTotal);
register.registerMetric(weatherRequestDuration);
register.registerMetric(dbConnectionsActive);
register.registerMetric(dbQueriesTotal);
register.registerMetric(dbQueryDuration);
register.registerMetric(redisOperationsTotal);
register.registerMetric(redisOperationDuration);
register.registerMetric(scheduledJobsTotal);
register.registerMetric(scheduledJobDuration);
register.registerMetric(logsTotal);
register.registerMetric(logsSampled);
