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
    try {
      const metrics = await register.metrics();
      const parsed = this.parsePrometheusMetrics(metrics);
      
      return {
        hits: parsed.cache_hits_total || 0,
        misses: parsed.cache_misses_total || 0,
        errors: parsed.cache_errors_total || 0,
        avgGetTime: parsed.avg_get_time || 0,
        avgSetTime: parsed.avg_set_time || 0,
        totalOperations: (parsed.cache_hits_total || 0) + (parsed.cache_misses_total || 0),
        hitRate: this.calculateHitRate(parsed.cache_hits_total || 0, parsed.cache_misses_total || 0),
        errorRate: this.calculateErrorRate(parsed.cache_errors_total || 0, (parsed.cache_hits_total || 0) + (parsed.cache_misses_total || 0))
      };
    } catch (error) {
      console.error('Error getting metrics data:', error);
      return {
        hits: 0, misses: 0, errors: 0, avgGetTime: 0, avgSetTime: 0,
        totalOperations: 0, hitRate: 0, errorRate: 0
      };
    }
  }

  private parsePrometheusMetrics(metrics: string) {
    const lines = metrics.split('\n');
    const result: any = {};
    
    for (const line of lines) {
      if (line.startsWith('cache_hits_total')) {
        result.cache_hits_total = parseFloat(line.split(' ')[1]) || 0;
      } else if (line.startsWith('cache_misses_total')) {
        result.cache_misses_total = parseFloat(line.split(' ')[1]) || 0;
      } else if (line.startsWith('cache_errors_total')) {
        result.cache_errors_total = parseFloat(line.split(' ')[1]) || 0;
      } else if (line.includes('cache_operation_duration_seconds_sum') && line.includes('operation="get"')) {
        result.avg_get_time = (parseFloat(line.split(' ')[1]) * 1000) || 0;
      }
    }
    
    return result;
  }

  private calculateHitRate(hits: number, misses: number): number {
    const total = hits + misses;
    return total > 0 ? parseFloat(((hits / total) * 100).toFixed(1)) : 0;
  }

  private calculateErrorRate(errors: number, total: number): number {
    return total > 0 ? parseFloat(((errors / total) * 100).toFixed(1)) : 0;
  }
}

export const cacheMetrics = new CacheMetrics();
export default CacheMetrics;
