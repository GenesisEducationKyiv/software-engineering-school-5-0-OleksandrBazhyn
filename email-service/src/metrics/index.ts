import { Counter, Histogram, Gauge, register } from "prom-client";

export class Metrics {
  // Email metrics
  public readonly emailsSentTotal: Counter<string>;
  public readonly emailsFailedTotal: Counter<string>;
  public readonly emailProcessingDuration: Histogram<string>;
  public readonly emailQueueSize: Gauge<string>;

  // System metrics
  public readonly httpRequestsTotal: Counter<string>;
  public readonly httpRequestDuration: Histogram<string>;
  public readonly activeConnections: Gauge<string>;

  // Business metrics
  public readonly confirmationEmailsTotal: Counter<string>;
  public readonly weatherEmailsTotal: Counter<string>;
  public readonly emailRetries: Counter<string>;

  constructor() {
    // Email metrics
    this.emailsSentTotal = new Counter({
      name: "emails_sent_total",
      help: "Total number of emails sent successfully",
      labelNames: ["type", "template"],
    });

    this.emailsFailedTotal = new Counter({
      name: "emails_failed_total",
      help: "Total number of failed email sends",
      labelNames: ["type", "template", "error_type"],
    });

    this.emailProcessingDuration = new Histogram({
      name: "email_processing_duration_seconds",
      help: "Duration of email processing in seconds",
      labelNames: ["type", "template"],
      buckets: [0.1, 0.3, 0.5, 0.7, 1, 1.5, 2, 5, 10],
    });

    this.emailQueueSize = new Gauge({
      name: "email_queue_size",
      help: "Current size of email queue",
    });

    // HTTP metrics
    this.httpRequestsTotal = new Counter({
      name: "http_requests_total",
      help: "Total number of HTTP requests",
      labelNames: ["method", "route", "status_code"],
    });

    this.httpRequestDuration = new Histogram({
      name: "http_request_duration_seconds",
      help: "Duration of HTTP requests in seconds",
      labelNames: ["method", "route"],
      buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
    });

    this.activeConnections = new Gauge({
      name: "active_connections",
      help: "Number of active connections",
    });

    // Business metrics
    this.confirmationEmailsTotal = new Counter({
      name: "confirmation_emails_total",
      help: "Total number of confirmation emails sent",
      labelNames: ["status"],
    });

    this.weatherEmailsTotal = new Counter({
      name: "weather_emails_total",
      help: "Total number of weather emails sent",
      labelNames: ["status", "city"],
    });

    this.emailRetries = new Counter({
      name: "email_retries_total",
      help: "Total number of email retry attempts",
      labelNames: ["type", "attempt"],
    });

    // Register all metrics
    register.registerMetric(this.emailsSentTotal);
    register.registerMetric(this.emailsFailedTotal);
    register.registerMetric(this.emailProcessingDuration);
    register.registerMetric(this.emailQueueSize);
    register.registerMetric(this.httpRequestsTotal);
    register.registerMetric(this.httpRequestDuration);
    register.registerMetric(this.activeConnections);
    register.registerMetric(this.confirmationEmailsTotal);
    register.registerMetric(this.weatherEmailsTotal);
    register.registerMetric(this.emailRetries);
  }

  // Helper methods for timing operations
  startTimer(metric: Histogram<string>) {
    return metric.startTimer();
  }

  // Get metrics for Prometheus scraping
  getMetrics() {
    return register.metrics();
  }

  // Reset all metrics (useful for testing)
  reset() {
    register.clear();
  }
}

// Singleton instance
export const metrics = new Metrics();
