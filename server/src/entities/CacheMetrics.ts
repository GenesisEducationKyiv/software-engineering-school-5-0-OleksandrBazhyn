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

  async getMetricsData() {
    const hits = await this.cacheHits.get();
    const misses = await this.cacheMisses.get();
    const duration = await this.cacheOperationDuration.get();
    const errors = await this.cacheErrors.get()

    const totalHits = hits.values.reduce((sum, metric) => sum + metric.value, 0);
    const totalMisses = misses.values.reduce((sum, metric) => sum + metric.value, 0);
    const totalErrors = errors.values.reduce((sum, metric) => sum + metric.value, 0);
    const totalOperations = totalHits + totalMisses;
    
    const hitRate = totalOperations > 0 ? ((totalHits / totalOperations) * 100).toFixed(2) : "0";
    
    const avgResponseTime = duration.values.length > 0 
      ? (duration.values.reduce((sum, metric) => sum + metric.value, 0) / duration.values.length * 1000).toFixed(2)
      : "0";

    const errorRate = totalOperations > 0 ? ((totalErrors / totalOperations) * 100).toFixed(2) : "0";

    return {
      hits: totalHits,
      misses: totalMisses,
      hitRate: parseFloat(hitRate),
      avgResponseTime: parseFloat(avgResponseTime),
      totalOperations,
      errors: totalErrors,
      errorRate: parseFloat(errorRate)
    };
  }
}

export const cacheMetrics = new CacheMetrics();
export default CacheMetrics;
