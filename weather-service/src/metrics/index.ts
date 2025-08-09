import client from "prom-client";

// HTTP request metrics
export const httpRequestsTotal = new client.Counter({
  name: "weather_service_http_requests_total",
  help: "Total number of HTTP requests",
  labelNames: ["method", "route", "status_code"],
});

export const httpRequestDuration = new client.Histogram({
  name: "weather_service_http_request_duration_seconds",
  help: "Duration of HTTP requests in seconds",
  labelNames: ["method", "route"],
  buckets: [0.1, 0.5, 1, 2, 5, 10],
});

// Weather provider metrics
export const weatherProviderRequestsTotal = new client.Counter({
  name: "weather_service_provider_requests_total",
  help: "Total number of requests to weather providers",
  labelNames: ["provider", "status"],
});

export const weatherProviderResponseTime = new client.Histogram({
  name: "weather_service_provider_response_time_seconds",
  help: "Response time of weather providers in seconds",
  labelNames: ["provider"],
  buckets: [0.5, 1, 2, 5, 10, 30],
});

// Cache metrics
export const cacheOperationsTotal = new client.Counter({
  name: "weather_service_cache_operations_total",
  help: "Total number of cache operations",
  labelNames: ["operation", "status"], // operation: hit, miss, set, invalidate
});

export const cacheResponseTime = new client.Histogram({
  name: "weather_service_cache_response_time_seconds",
  help: "Cache operation response time in seconds",
  labelNames: ["operation"],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1],
});

// gRPC metrics
export const grpcRequestsTotal = new client.Counter({
  name: "weather_service_grpc_requests_total",
  help: "Total number of gRPC requests",
  labelNames: ["method", "status"],
});

export const grpcRequestDuration = new client.Histogram({
  name: "weather_service_grpc_request_duration_seconds",
  help: "Duration of gRPC requests in seconds",
  labelNames: ["method"],
  buckets: [0.1, 0.5, 1, 2, 5, 10],
});

// System metrics
export const activeConnections = new client.Gauge({
  name: "weather_service_active_connections",
  help: "Number of active connections",
});

export const errorRate = new client.Counter({
  name: "weather_service_errors_total",
  help: "Total number of errors",
  labelNames: ["type", "service"],
});

export const healthStatus = new client.Gauge({
  name: "weather_service_health_status",
  help: "Health status of the service (1 = healthy, 0 = unhealthy)",
  labelNames: ["component"],
});

// Application-specific metrics
export const weatherRequestsByCity = new client.Counter({
  name: "weather_service_requests_by_city_total",
  help: "Total number of weather requests by city",
  labelNames: ["city"],
});

export const rateLimitHits = new client.Counter({
  name: "weather_service_rate_limit_hits_total",
  help: "Total number of rate limit hits",
  labelNames: ["provider"],
});

// Memory and performance metrics
export const memoryUsage = new client.Gauge({
  name: "weather_service_memory_usage_bytes",
  help: "Memory usage in bytes",
  labelNames: ["type"], // rss, heapUsed, heapTotal, external
});

// Update memory metrics periodically
setInterval(() => {
  const usage = process.memoryUsage();
  memoryUsage.set({ type: "rss" }, usage.rss);
  memoryUsage.set({ type: "heapUsed" }, usage.heapUsed);
  memoryUsage.set({ type: "heapTotal" }, usage.heapTotal);
  memoryUsage.set({ type: "external" }, usage.external);
}, 10000); // Update every 10 seconds

// Register all custom metrics
client.register.registerMetric(httpRequestsTotal);
client.register.registerMetric(httpRequestDuration);
client.register.registerMetric(weatherProviderRequestsTotal);
client.register.registerMetric(weatherProviderResponseTime);
client.register.registerMetric(cacheOperationsTotal);
client.register.registerMetric(cacheResponseTime);
client.register.registerMetric(grpcRequestsTotal);
client.register.registerMetric(grpcRequestDuration);
client.register.registerMetric(activeConnections);
client.register.registerMetric(errorRate);
client.register.registerMetric(healthStatus);
client.register.registerMetric(weatherRequestsByCity);
client.register.registerMetric(rateLimitHits);
client.register.registerMetric(memoryUsage);

export { client };
