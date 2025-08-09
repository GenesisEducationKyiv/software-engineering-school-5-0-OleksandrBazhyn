/* eslint-disable */
import axios from 'axios';
import grpc from '@grpc/grpc-js';
import protoLoader from '@grpc/proto-loader';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const HTTP_BASE_URL = 'http://localhost:3000/api/v1';
const GRPC_ADDRESS = 'localhost:50051';
const PROTO_PATH = path.join(__dirname, '../grpc-shared/proto/weather.proto');

// Load gRPC
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

const weatherProto = grpc.loadPackageDefinition(packageDefinition);

// Test data
const SINGLE_CITIES = ['Prague', 'London', 'Paris', 'Berlin', 'Madrid'];
const BATCH_CITIES = ['Prague', 'London', 'Paris', 'Berlin', 'Madrid', 'Rome', 'Vienna', 'Amsterdam'];
const INVALID_CITY = 'InvalidCity12345';

// Performance tracking
class PerformanceTracker {
  constructor() {
    this.results = {
      http: {
        singleRequests: [],
        batchRequests: [],
        healthChecks: [],
        errorHandling: []
      },
      grpc: {
        singleRequests: [],
        batchRequests: [],
        healthChecks: [],
        errorHandling: []
      }
    };
  }

  startTimer() {
    return process.hrtime.bigint();
  }

  endTimer(startTime) {
    const endTime = process.hrtime.bigint();
    return Number(endTime - startTime) / 1_000_000; // Convert to milliseconds
  }

  addResult(protocol, operation, duration, success = true, additionalData = {}) {
    this.results[protocol][operation].push({
      duration,
      success,
      timestamp: Date.now(),
      ...additionalData
    });
  }

  getStats(data) {
    if (data.length === 0) return { avg: 0, min: 0, max: 0, total: 0, successRate: 0 };
    
    const durations = data.map(r => r.duration);
    const successCount = data.filter(r => r.success).length;
    
    return {
      avg: durations.reduce((a, b) => a + b, 0) / durations.length,
      min: Math.min(...durations),
      max: Math.max(...durations),
      total: durations.length,
      successRate: (successCount / data.length) * 100
    };
  }

  generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      summary: {},
      detailed: this.results
    };

    // Generate summary statistics
    Object.keys(this.results).forEach(protocol => {
      report.summary[protocol] = {};
      Object.keys(this.results[protocol]).forEach(operation => {
        report.summary[protocol][operation] = this.getStats(this.results[protocol][operation]);
      });
    });

    return report;
  }
}

// HTTP Client
class HTTPClient {
  constructor() {
    this.client = axios.create({
      baseURL: HTTP_BASE_URL,
      timeout: 10000
    });
  }

  async healthCheck() {
    const response = await this.client.get('/health');
    return response.data;
  }

  async getWeather(city) {
    const response = await this.client.get('/weather', { params: { city } });
    return response.data;
  }

  async getWeatherBatch(cities) {
    // HTTP doesn't have native batch support, so we'll make parallel requests
    const promises = cities.map(city => 
      this.getWeather(city).catch(error => ({ error: true, city, message: error.message }))
    );
    const results = await Promise.all(promises);
    
    // Format to match gRPC response structure
    const validResults = results.filter(r => !r.error);
    return {
      success: true,
      data: validResults.map(r => ({
        ...r,
        city: cities[results.indexOf(r)],
        timestamp: Date.now()
      })),
      totalRequested: cities.length,
      validResults: validResults.length
    };
  }
}

// gRPC Client
class GRPCClient {
  constructor() {
    this.client = new weatherProto.weather.WeatherService(
      GRPC_ADDRESS,
      grpc.credentials.createInsecure()
    );
  }

  async healthCheck() {
    return new Promise((resolve, reject) => {
      this.client.HealthCheck({ service: 'weather' }, (error, response) => {
        if (error) reject(error);
        else resolve(response);
      });
    });
  }

  async getWeather(city) {
    return new Promise((resolve, reject) => {
      this.client.GetWeather({ city }, (error, response) => {
        if (error) reject(error);
        else resolve(response);
      });
    });
  }

  async getWeatherBatch(cities) {
    return new Promise((resolve, reject) => {
      this.client.GetWeatherBatch({ cities }, (error, response) => {
        if (error) reject(error);
        else resolve(response);
      });
    });
  }

  close() {
    this.client.close();
  }
}

// Benchmark Tests
class BenchmarkSuite {
  constructor() {
    this.tracker = new PerformanceTracker();
    this.httpClient = new HTTPClient();
    this.grpcClient = new GRPCClient();
  }

  async runSingleRequestTest(iterations = 10) {
    console.log(`🔥 Running Single Request Test (${iterations} iterations per city)...`);
    
    for (const city of SINGLE_CITIES) {
      console.log(`  Testing ${city}...`);
      
      // HTTP tests
      for (let i = 0; i < iterations; i++) {
        try {
          const start = this.tracker.startTimer();
          const result = await this.httpClient.getWeather(city);
          const duration = this.tracker.endTimer(start);
          this.tracker.addResult('http', 'singleRequests', duration, true, { city });
        } catch (error) {
          const duration = this.tracker.endTimer(this.tracker.startTimer());
          this.tracker.addResult('http', 'singleRequests', duration, false, { city, error: error.message });
        }
      }

      // gRPC tests
      for (let i = 0; i < iterations; i++) {
        try {
          const start = this.tracker.startTimer();
          const result = await this.grpcClient.getWeather(city);
          const duration = this.tracker.endTimer(start);
          this.tracker.addResult('grpc', 'singleRequests', duration, result.success, { city });
        } catch (error) {
          const duration = this.tracker.endTimer(this.tracker.startTimer());
          this.tracker.addResult('grpc', 'singleRequests', duration, false, { city, error: error.message });
        }
      }
    }
  }

  async runBatchRequestTest(iterations = 5) {
    console.log(`🌍 Running Batch Request Test (${iterations} iterations)...`);
    
    for (let i = 0; i < iterations; i++) {
      // HTTP batch test
      try {
        const start = this.tracker.startTimer();
        const result = await this.httpClient.getWeatherBatch(BATCH_CITIES);
        const duration = this.tracker.endTimer(start);
        this.tracker.addResult('http', 'batchRequests', duration, true, { 
          citiesCount: BATCH_CITIES.length,
          validResults: result.validResults 
        });
      } catch (error) {
        const duration = this.tracker.endTimer(this.tracker.startTimer());
        this.tracker.addResult('http', 'batchRequests', duration, false, { error: error.message });
      }

      // gRPC batch test
      try {
        const start = this.tracker.startTimer();
        const result = await this.grpcClient.getWeatherBatch(BATCH_CITIES);
        const duration = this.tracker.endTimer(start);
        this.tracker.addResult('grpc', 'batchRequests', duration, result.success, { 
          citiesCount: BATCH_CITIES.length,
          validResults: result.data.length 
        });
      } catch (error) {
        const duration = this.tracker.endTimer(this.tracker.startTimer());
        this.tracker.addResult('grpc', 'batchRequests', duration, false, { error: error.message });
      }
    }
  }

  async runHealthCheckTest(iterations = 20) {
    console.log(`💓 Running Health Check Test (${iterations} iterations)...`);
    
    for (let i = 0; i < iterations; i++) {
      // HTTP health check
      try {
        const start = this.tracker.startTimer();
        const result = await this.httpClient.healthCheck();
        const duration = this.tracker.endTimer(start);
        this.tracker.addResult('http', 'healthChecks', duration, result.status === 'healthy');
      } catch (error) {
        const duration = this.tracker.endTimer(this.tracker.startTimer());
        this.tracker.addResult('http', 'healthChecks', duration, false, { error: error.message });
      }

      // gRPC health check
      try {
        const start = this.tracker.startTimer();
        const result = await this.grpcClient.healthCheck();
        const duration = this.tracker.endTimer(start);
        this.tracker.addResult('grpc', 'healthChecks', duration, result.status === 'SERVING' || result.status === 1);
      } catch (error) {
        const duration = this.tracker.endTimer(this.tracker.startTimer());
        this.tracker.addResult('grpc', 'healthChecks', duration, false, { error: error.message });
      }
    }
  }

  async runErrorHandlingTest(iterations = 5) {
    console.log(`❌ Running Error Handling Test (${iterations} iterations)...`);
    
    for (let i = 0; i < iterations; i++) {
      // HTTP error handling
      try {
        const start = this.tracker.startTimer();
        await this.httpClient.getWeather(INVALID_CITY);
        const duration = this.tracker.endTimer(start);
        this.tracker.addResult('http', 'errorHandling', duration, false, { expectedError: true });
      } catch (error) {
        const duration = this.tracker.endTimer(this.tracker.startTimer());
        const isExpectedError = error.response?.status === 404;
        this.tracker.addResult('http', 'errorHandling', duration, isExpectedError, { 
          expectedError: true,
          statusCode: error.response?.status 
        });
      }

      // gRPC error handling
      try {
        const start = this.tracker.startTimer();
        const result = await this.grpcClient.getWeather(INVALID_CITY);
        const duration = this.tracker.endTimer(start);
        const isExpectedError = !result.success && result.error_message === 'City not found';
        this.tracker.addResult('grpc', 'errorHandling', duration, isExpectedError, { expectedError: true });
      } catch (error) {
        const duration = this.tracker.endTimer(this.tracker.startTimer());
        this.tracker.addResult('grpc', 'errorHandling', duration, false, { error: error.message });
      }
    }
  }

  async runFullBenchmark() {
    console.log('🚀 Starting Weather Service Performance Benchmark\n');
    console.log('📊 Testing HTTP REST API vs gRPC performance\n');

    const startTime = Date.now();

    try {
      await this.runHealthCheckTest(20);
      await this.runSingleRequestTest(10);
      await this.runBatchRequestTest(5);
      await this.runErrorHandlingTest(5);

      const endTime = Date.now();
      const totalDuration = endTime - startTime;

      console.log(`\n✅ Benchmark completed in ${totalDuration}ms`);
      
      const report = this.tracker.generateReport();
      this.printResults(report);
      await this.saveResults(report);
      
    } catch (error) {
      console.error('❌ Benchmark failed:', error);
    } finally {
      this.grpcClient.close();
    }
  }

  printResults(report) {
    console.log('\n📈 PERFORMANCE BENCHMARK RESULTS');
    console.log('='.repeat(50));
    
    const protocols = ['http', 'grpc'];
    const operations = ['healthChecks', 'singleRequests', 'batchRequests', 'errorHandling'];
    
    protocols.forEach(protocol => {
      console.log(`\n${protocol.toUpperCase()} RESULTS:`);
      operations.forEach(operation => {
        const stats = report.summary[protocol][operation];
        if (stats.total > 0) {
          console.log(`  ${operation}:`);
          console.log(`    Average: ${stats.avg.toFixed(2)}ms`);
          console.log(`    Min: ${stats.min.toFixed(2)}ms`);
          console.log(`    Max: ${stats.max.toFixed(2)}ms`);
          console.log(`    Success Rate: ${stats.successRate.toFixed(1)}%`);
          console.log(`    Total Tests: ${stats.total}`);
        }
      });
    });

    // Comparison
    console.log('\n🏆 COMPARISON (HTTP vs gRPC):');
    console.log('-'.repeat(30));
    operations.forEach(operation => {
      const httpStats = report.summary.http[operation];
      const grpcStats = report.summary.grpc[operation];
      
      if (httpStats.total > 0 && grpcStats.total > 0) {
        const improvement = ((httpStats.avg - grpcStats.avg) / httpStats.avg * 100);
        const winner = improvement > 0 ? 'gRPC' : 'HTTP';
        const percentage = Math.abs(improvement).toFixed(1);
        
        console.log(`${operation}: ${winner} is ${percentage}% faster`);
      }
    });
  }

  async saveResults(report) {
    const fs = await import('fs');
    const resultsPath = 'benchmark-results.json';
    
    try {
      fs.writeFileSync(resultsPath, JSON.stringify(report, null, 2));
      console.log(`\n💾 Results saved to ${resultsPath}`);
    } catch (error) {
      console.error('❌ Failed to save results:', error.message);
    }
  }
}

// Main execution
async function main() {
  const benchmark = new BenchmarkSuite();
  await benchmark.runFullBenchmark();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}
