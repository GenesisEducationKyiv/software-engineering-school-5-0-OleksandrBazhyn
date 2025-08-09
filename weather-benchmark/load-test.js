import axios from 'axios';
import grpc from '@grpc/grpc-js';
import protoLoader from '@grpc/proto-loader';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import http from 'http';
import { SystemMonitor } from './system-monitor.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const HTTP_BASE_URL = 'http://localhost:3000/api/v1';
const GRPC_ADDRESS = 'localhost:50051';
const PROTO_PATH = path.join(__dirname, '../grpc-shared/proto/weather.proto');

console.log('🔥 Starting LOAD TEST for HTTP vs gRPC');
console.log('📋 Target: 1000 RPS as per system requirements');
console.log('⚠️  This test simulates production load - ensure proper setup!\n');

// Load gRPC
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

const weatherProto = grpc.loadPackageDefinition(packageDefinition);

// Configuration for load testing
const LOAD_TEST_CONFIG = {
  // Target 1000 RPS as per system requirements
  targetRPS: 1000,
  testDurationSeconds: 30, // 30 seconds of load
  rampUpSeconds: 10, // Gradually increase load over 10 seconds
  cities: ['Prague', 'London', 'Paris', 'Berlin', 'Madrid', 'Rome', 'Vienna', 'Amsterdam'],
  maxConcurrency: 100 // Maximum concurrent connections
};

// Performance tracking for load test
class LoadTestTracker {
  constructor() {
    this.results = {
      http: { requests: [], errors: [], connectionsActive: 0 },
      grpc: { requests: [], errors: [], connectionsActive: 0 }
    };
    this.startTime = null;
  }

  addResult(protocol, duration, success, error = null) {
    const timestamp = Date.now() - this.startTime;
    this.results[protocol].requests.push({
      duration,
      success,
      timestamp,
      error
    });
    
    if (!success && error) {
      this.results[protocol].errors.push({
        timestamp,
        error: error.message || error
      });
    }
  }

  setConnectionCount(protocol, count) {
    this.results[protocol].connectionsActive = count;
  }

  start() {
    this.startTime = Date.now();
  }

  getStats(protocol) {
    const requests = this.results[protocol].requests;
    const errors = this.results[protocol].errors;
    
    if (requests.length === 0) return null;

    const successfulRequests = requests.filter(r => r.success);
    const durations = successfulRequests.map(r => r.duration);
    
    // Calculate RPS over time
    const totalDuration = (requests[requests.length - 1]?.timestamp || 0) / 1000; // to seconds
    const actualRPS = requests.length / totalDuration;
    
    // Calculate percentiles
    const sortedDurations = durations.sort((a, b) => a - b);
    const p50 = sortedDurations[Math.floor(sortedDurations.length * 0.5)] || 0;
    const p95 = sortedDurations[Math.floor(sortedDurations.length * 0.95)] || 0;
    const p99 = sortedDurations[Math.floor(sortedDurations.length * 0.99)] || 0;

    return {
      totalRequests: requests.length,
      successfulRequests: successfulRequests.length,
      failedRequests: requests.length - successfulRequests.length,
      errorRate: ((requests.length - successfulRequests.length) / requests.length * 100),
      actualRPS: actualRPS,
      avgLatency: durations.reduce((a, b) => a + b, 0) / durations.length || 0,
      p50Latency: p50,
      p95Latency: p95,
      p99Latency: p99,
      minLatency: Math.min(...durations) || 0,
      maxLatency: Math.max(...durations) || 0,
      errors: errors,
      connectionsActive: this.results[protocol].connectionsActive
    };
  }
}

// HTTP Client with connection pooling for load testing
class HTTPLoadClient {
  constructor() {
    this.client = axios.create({
      baseURL: HTTP_BASE_URL,
      timeout: 5000,
      // Connection pooling for load testing
      httpAgent: new http.Agent({
        keepAlive: true,
        maxSockets: LOAD_TEST_CONFIG.maxConcurrency,
        maxFreeSockets: 50
      }),
      maxRedirects: 0
    });
  }

  async getWeather(city) {
    const response = await this.client.get('/weather', { params: { city } });
    return response.data;
  }

  async healthCheck() {
    const response = await this.client.get('/health');
    return response.data;
  }
}

// gRPC Client pool for load testing
class GRPCLoadClient {
  constructor() {
    this.clients = [];
    this.currentClientIndex = 0;
    
    // Create multiple gRPC connections for load testing
    for (let i = 0; i < Math.min(LOAD_TEST_CONFIG.maxConcurrency, 20); i++) {
      const client = new weatherProto.weather.WeatherService(
        GRPC_ADDRESS,
        grpc.credentials.createInsecure(),
        {
          'grpc.keepalive_time_ms': 30000,
          'grpc.keepalive_timeout_ms': 5000,
          'grpc.max_connection_idle_ms': 60000,
          'grpc.max_connection_age_ms': 300000
        }
      );
      this.clients.push(client);
    }
  }

  getClient() {
    const client = this.clients[this.currentClientIndex];
    this.currentClientIndex = (this.currentClientIndex + 1) % this.clients.length;
    return client;
  }

  async getWeather(city) {
    return new Promise((resolve, reject) => {
      const client = this.getClient();
      client.GetWeather({ city }, (error, response) => {
        if (error) reject(error);
        else resolve(response);
      });
    });
  }

  async healthCheck() {
    return new Promise((resolve, reject) => {
      const client = this.getClient();
      client.HealthCheck({ service: 'weather' }, (error, response) => {
        if (error) reject(error);
        else resolve(response);
      });
    });
  }

  closeAll() {
    this.clients.forEach(client => client.close());
  }
}

// Load test executor
class LoadTestExecutor {
  constructor() {
    this.tracker = new LoadTestTracker();
    this.httpClient = new HTTPLoadClient();
    this.grpcClient = new GRPCLoadClient();
    this.systemMonitor = new SystemMonitor();
    this.isRunning = false;
  }

  async executeRequest(protocol, operation, ...args) {
    const start = process.hrtime.bigint();
    
    try {
      let result;
      if (protocol === 'http') {
        result = await this.httpClient[operation](...args);
      } else {
        result = await this.grpcClient[operation](...args);
      }
      
      const duration = Number(process.hrtime.bigint() - start) / 1_000_000; // to ms
      this.tracker.addResult(protocol, duration, true);
      return result;
    } catch (error) {
      const duration = Number(process.hrtime.bigint() - start) / 1_000_000;
      this.tracker.addResult(protocol, duration, false, error);
      throw error;
    }
  }

  async runLoadTest(protocol, testDurationMs) {
    const targetRPS = LOAD_TEST_CONFIG.targetRPS;
    const rampUpMs = LOAD_TEST_CONFIG.rampUpSeconds * 1000;
    const intervalMs = 1000 / targetRPS; // Interval between requests to achieve target RPS
    
    console.log(`🚀 Starting ${protocol.toUpperCase()} load test...`);
    console.log(`   Target: ${targetRPS} RPS for ${testDurationMs/1000}s`);
    console.log(`   Ramp-up: ${rampUpMs/1000}s`);
    
    const startTime = Date.now();
    let requestCount = 0;
    let activeRequests = 0;
    
    const makeRequest = async () => {
      if (!this.isRunning) return;
      
      activeRequests++;
      this.tracker.setConnectionCount(protocol, activeRequests);
      
      try {
        const city = LOAD_TEST_CONFIG.cities[requestCount % LOAD_TEST_CONFIG.cities.length];
        await this.executeRequest(protocol, 'getWeather', city);
      } catch (error) {
        // Error already tracked in executeRequest
      }
      
      activeRequests--;
      requestCount++;
    };

    // Start the load test
    this.isRunning = true;
    
    const requestInterval = setInterval(() => {
      if (!this.isRunning || Date.now() - startTime > testDurationMs) {
        clearInterval(requestInterval);
        return;
      }
      
      // Implement ramp-up
      const elapsed = Date.now() - startTime;
      const rampUpFactor = Math.min(elapsed / rampUpMs, 1);
      const currentTargetRPS = targetRPS * rampUpFactor;
      
      // Control request rate
      if (requestCount < (elapsed / 1000) * currentTargetRPS) {
        makeRequest().catch(() => {}); // Fire and forget
      }
    }, Math.max(intervalMs / 10, 1)); // Check 10 times more frequently than target interval

    // Wait for test completion
    await new Promise(resolve => setTimeout(resolve, testDurationMs));
    this.isRunning = false;
    clearInterval(requestInterval);
    
    // Wait for pending requests to complete
    const maxWaitTime = 5000; // 5 seconds
    const waitStart = Date.now();
    while (activeRequests > 0 && Date.now() - waitStart < maxWaitTime) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log(`✅ ${protocol.toUpperCase()} load test completed`);
    console.log(`   Requests sent: ${requestCount}`);
    console.log(`   Pending requests: ${activeRequests}`);
  }

  async runComparativeLoadTest() {
    console.log('🔥 COMPARATIVE LOAD TEST: HTTP vs gRPC\n');
    
    // Start system monitoring
    this.systemMonitor.start(1000); // Monitor every second
    
    this.tracker.start();
    const testDurationMs = LOAD_TEST_CONFIG.testDurationSeconds * 1000;
    
    // Run HTTP load test
    await this.runLoadTest('http', testDurationMs);
    
    console.log('\n⏱️  Cooling down for 5 seconds...\n');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Run gRPC load test
    await this.runLoadTest('grpc', testDurationMs);
    
    // Stop system monitoring
    this.systemMonitor.stop();
    
    // Generate report
    this.generateLoadTestReport();
    
    // Cleanup
    this.grpcClient.closeAll();
  }

  generateLoadTestReport() {
    console.log('\n📊 LOAD TEST RESULTS');
    console.log('='.repeat(60));
    
    const httpStats = this.tracker.getStats('http');
    const grpcStats = this.tracker.getStats('grpc');
    
    if (!httpStats || !grpcStats) {
      console.error('❌ Insufficient data for comparison');
      return;
    }

    // Print detailed stats
    [
      { name: 'HTTP', stats: httpStats },
      { name: 'gRPC', stats: grpcStats }
    ].forEach(({ name, stats }) => {
      console.log(`\n${name} LOAD TEST RESULTS:`);
      console.log(`  Target RPS: ${LOAD_TEST_CONFIG.targetRPS}`);
      console.log(`  Actual RPS: ${stats.actualRPS.toFixed(2)}`);
      console.log(`  Total Requests: ${stats.totalRequests}`);
      console.log(`  Successful: ${stats.successfulRequests}`);
      console.log(`  Failed: ${stats.failedRequests}`);
      console.log(`  Error Rate: ${stats.errorRate.toFixed(2)}%`);
      console.log(`  Average Latency: ${stats.avgLatency.toFixed(2)}ms`);
      console.log(`  P50 Latency: ${stats.p50Latency.toFixed(2)}ms`);
      console.log(`  P95 Latency: ${stats.p95Latency.toFixed(2)}ms`);
      console.log(`  P99 Latency: ${stats.p99Latency.toFixed(2)}ms`);
      console.log(`  Min Latency: ${stats.minLatency.toFixed(2)}ms`);
      console.log(`  Max Latency: ${stats.maxLatency.toFixed(2)}ms`);
      
      if (stats.errors.length > 0) {
        console.log(`  Sample Errors:`);
        stats.errors.slice(0, 3).forEach((error, i) => {
          console.log(`    ${i+1}. ${error.error}`);
        });
      }
    });

    // Comparison
    console.log('\n🏆 LOAD TEST COMPARISON:');
    console.log('-'.repeat(40));
    
    const metrics = [
      { name: 'RPS Achievement', http: httpStats.actualRPS, grpc: grpcStats.actualRPS, unit: ' req/s', higher: true },
      { name: 'Error Rate', http: httpStats.errorRate, grpc: grpcStats.errorRate, unit: '%', higher: false },
      { name: 'Average Latency', http: httpStats.avgLatency, grpc: grpcStats.avgLatency, unit: 'ms', higher: false },
      { name: 'P95 Latency', http: httpStats.p95Latency, grpc: grpcStats.p95Latency, unit: 'ms', higher: false },
      { name: 'P99 Latency', http: httpStats.p99Latency, grpc: grpcStats.p99Latency, unit: 'ms', higher: false }
    ];

    metrics.forEach(metric => {
      const diff = ((metric.grpc - metric.http) / metric.http * 100);
      const winner = metric.higher ? 
        (metric.grpc > metric.http ? 'gRPC' : 'HTTP') :
        (metric.grpc < metric.http ? 'gRPC' : 'HTTP');
      const percentage = Math.abs(diff).toFixed(1);
      
      console.log(`${metric.name}: ${winner} wins by ${percentage}% (HTTP: ${metric.http.toFixed(2)}${metric.unit}, gRPC: ${metric.grpc.toFixed(2)}${metric.unit})`);
    });

    // System requirements compliance
    console.log('\n📋 SYSTEM REQUIREMENTS COMPLIANCE:');
    console.log('-'.repeat(45));
    
    const targetRPS = LOAD_TEST_CONFIG.targetRPS;
    const httpCompliance = (httpStats.actualRPS / targetRPS * 100);
    const grpcCompliance = (grpcStats.actualRPS / targetRPS * 100);
    
    console.log(`Target: ${targetRPS} RPS (system requirement)`);
    console.log(`HTTP Achievement: ${httpCompliance.toFixed(1)}% (${httpStats.actualRPS.toFixed(2)} RPS)`);
    console.log(`gRPC Achievement: ${grpcCompliance.toFixed(1)}% (${grpcStats.actualRPS.toFixed(2)} RPS)`);
    
    if (httpCompliance >= 90 && grpcCompliance >= 90) {
      console.log('✅ Both protocols meet system requirements');
    } else if (httpCompliance >= 90) {
      console.log('⚠️  Only HTTP meets system requirements');
    } else if (grpcCompliance >= 90) {
      console.log('⚠️  Only gRPC meets system requirements');
    } else {
      console.log('❌ Neither protocol meets system requirements under load');
    }

    // Save load test results
    const loadTestResults = {
      timestamp: new Date().toISOString(),
      configuration: LOAD_TEST_CONFIG,
      systemRequirements: {
        targetRPS: targetRPS,
        latencyRequirement: '< 200ms'
      },
      results: {
        http: httpStats,
        grpc: grpcStats
      },
      compliance: {
        http: httpCompliance,
        grpc: grpcCompliance
      }
    };

    fs.writeFileSync('load-test-results.json', JSON.stringify(loadTestResults, null, 2));
    console.log('\n💾 Load test results saved to load-test-results.json');
  }
}

// Main execution
async function main() {
  const executor = new LoadTestExecutor();
  
  try {
    // Warn about load testing
    console.log('⚠️  WARNING: This is a high-load test!');
    console.log('   Make sure your system can handle 1000 RPS');
    console.log('   Monitor system resources during the test');
    console.log('   Press Ctrl+C to abort if needed\n');
    
    await new Promise(resolve => setTimeout(resolve, 3000)); // 3 second warning
    
    await executor.runComparativeLoadTest();
    
    console.log('\n🎉 Load testing completed successfully!');
    
  } catch (error) {
    console.error('❌ Load test failed:', error);
    executor.grpcClient.closeAll();
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { LoadTestExecutor };
