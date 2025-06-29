import { Counter, Histogram, register } from "prom-client";
import { CacheMetricsInterface } from "../types.js";

class CacheMetrics implements CacheMetricsInterface {
  public cacheHits: Counter<string>;
  public cacheMisses: Counter<string>;
  public cacheErrors: Counter<string>;
  public cacheOperationDuration: Histogram<string>;

  constructor() {
    this.cacheHits = new Counter({
      name: "cache_hits_total",
      help: "Total number of cache hits",
      labelNames: ["cache_type", "key_prefix"],
    });

    this.cacheMisses = new Counter({
      name: "cache_misses_total",
      help: "Total number of cache misses",
      labelNames: ["cache_type", "key_prefix"],
    });

    this.cacheErrors = new Counter({
      name: "cache_errors_total",
      help: "Total number of cache errors",
      labelNames: ["cache_type", "operation"],
    });

    this.cacheOperationDuration = new Histogram({
      name: "cache_operation_duration_seconds",
      help: "Duration of cache operations",
      labelNames: ["cache_type", "operation"],
      buckets: [0.001, 0.01, 0.1, 1, 10],
    });

    // Register metrics
    register.registerMetric(this.cacheHits);
    register.registerMetric(this.cacheMisses);
    register.registerMetric(this.cacheErrors);
    register.registerMetric(this.cacheOperationDuration);
  }

  recordHit(cacheType: string, keyPrefix: string): void {
    this.cacheHits.inc({ cache_type: cacheType, key_prefix: keyPrefix });
  }

  recordMiss(cacheType: string, keyPrefix: string): void {
    this.cacheMisses.inc({ cache_type: cacheType, key_prefix: keyPrefix });
  }

  recordError(cacheType: string, operation: string): void {
    this.cacheErrors.inc({ cache_type: cacheType, operation });
  }

  recordOperationDuration(cacheType: string, operation: string, duration: number): void {
    this.cacheOperationDuration.observe({ cache_type: cacheType, operation }, duration);
  }

  async getMetrics(): Promise<string> {
    return await register.metrics();
  }
}

export const cacheMetrics = new CacheMetrics();
export default CacheMetrics;
