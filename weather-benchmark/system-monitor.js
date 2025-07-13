import os from 'os';
import fs from 'fs';

export class SystemMonitor {
  constructor() {
    this.metrics = [];
    this.isMonitoring = false;
    this.interval = null;
  }

  start(intervalMs = 1000) {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    this.metrics = [];
    
    console.log('📊 Starting system monitoring...');
    
    this.interval = setInterval(() => {
      const metric = this.collectMetrics();
      this.metrics.push(metric);
      
      // Log real-time metrics every 5 seconds
      if (this.metrics.length % 5 === 0) {
        console.log(`[Monitor] CPU: ${metric.cpuUsage.toFixed(1)}%, Memory: ${metric.memoryUsage.toFixed(1)}%, Free Memory: ${metric.freeMemory.toFixed(1)}GB`);
      }
    }, intervalMs);
  }

  stop() {
    if (!this.isMonitoring) return;
    
    this.isMonitoring = false;
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    
    console.log('📊 System monitoring stopped');
    this.generateReport();
  }

  collectMetrics() {
    const cpus = os.cpus();
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    
    // Calculate CPU usage (simplified)
    let totalIdle = 0;
    let totalTick = 0;
    
    cpus.forEach(cpu => {
      for (const type in cpu.times) {
        totalTick += cpu.times[type];
      }
      totalIdle += cpu.times.idle;
    });
    
    const idle = totalIdle / cpus.length;
    const total = totalTick / cpus.length;
    const usage = 100 - ~~(100 * idle / total);

    return {
      timestamp: Date.now(),
      cpuUsage: usage,
      memoryUsage: (usedMem / totalMem) * 100,
      freeMemory: freeMem / (1024 * 1024 * 1024), // GB
      totalMemory: totalMem / (1024 * 1024 * 1024), // GB
      usedMemory: usedMem / (1024 * 1024 * 1024), // GB
      cpuCount: cpus.length,
      loadAverage: os.loadavg(),
      platform: os.platform(),
      arch: os.arch()
    };
  }

  generateReport() {
    if (this.metrics.length === 0) {
      console.log('⚠️  No monitoring data collected');
      return;
    }

    const cpuUsages = this.metrics.map(m => m.cpuUsage);
    const memoryUsages = this.metrics.map(m => m.memoryUsage);
    
    const stats = {
      cpu: {
        avg: cpuUsages.reduce((a, b) => a + b, 0) / cpuUsages.length,
        min: Math.min(...cpuUsages),
        max: Math.max(...cpuUsages),
        samples: cpuUsages.length
      },
      memory: {
        avg: memoryUsages.reduce((a, b) => a + b, 0) / memoryUsages.length,
        min: Math.min(...memoryUsages),
        max: Math.max(...memoryUsages),
        samples: memoryUsages.length
      },
      system: {
        cpuCount: this.metrics[0].cpuCount,
        totalMemory: this.metrics[0].totalMemory,
        platform: this.metrics[0].platform,
        arch: this.metrics[0].arch
      }
    };

    console.log('\n💻 SYSTEM RESOURCE REPORT:');
    console.log('-'.repeat(35));
    console.log(`Platform: ${stats.system.platform} ${stats.system.arch}`);
    console.log(`CPU Cores: ${stats.system.cpuCount}`);
    console.log(`Total Memory: ${stats.system.totalMemory.toFixed(2)}GB`);
    console.log(`\nCPU Usage:`);
    console.log(`  Average: ${stats.cpu.avg.toFixed(1)}%`);
    console.log(`  Min: ${stats.cpu.min.toFixed(1)}%`);
    console.log(`  Max: ${stats.cpu.max.toFixed(1)}%`);
    console.log(`\nMemory Usage:`);
    console.log(`  Average: ${stats.memory.avg.toFixed(1)}%`);
    console.log(`  Min: ${stats.memory.min.toFixed(1)}%`);
    console.log(`  Max: ${stats.memory.max.toFixed(1)}%`);
    console.log(`\nSamples: ${stats.cpu.samples} (${(stats.cpu.samples * 1000 / 1000).toFixed(0)}s monitoring)`);

    // Resource warnings
    if (stats.cpu.max > 90) {
      console.log('⚠️  WARNING: High CPU usage detected (>90%)');
    }
    if (stats.memory.max > 90) {
      console.log('⚠️  WARNING: High memory usage detected (>90%)');
    }
    if (stats.cpu.avg > 70) {
      console.log('⚠️  WARNING: Average CPU usage is high (>70%)');
    }

    // Save detailed metrics
    const report = {
      timestamp: new Date().toISOString(),
      summary: stats,
      detailedMetrics: this.metrics
    };

    fs.writeFileSync('system-monitoring-report.json', JSON.stringify(report, null, 2));
    console.log('💾 System monitoring report saved to system-monitoring-report.json');
  }

  getResourceWarnings() {
    if (this.metrics.length === 0) return [];
    
    const warnings = [];
    const latestMetric = this.metrics[this.metrics.length - 1];
    
    if (latestMetric.cpuUsage > 90) {
      warnings.push(`High CPU usage: ${latestMetric.cpuUsage.toFixed(1)}%`);
    }
    
    if (latestMetric.memoryUsage > 90) {
      warnings.push(`High memory usage: ${latestMetric.memoryUsage.toFixed(1)}%`);
    }
    
    if (latestMetric.freeMemory < 0.5) {
      warnings.push(`Low free memory: ${latestMetric.freeMemory.toFixed(2)}GB`);
    }
    
    return warnings;
  }
}
