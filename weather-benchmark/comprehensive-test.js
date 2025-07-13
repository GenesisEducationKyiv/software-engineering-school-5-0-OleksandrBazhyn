import axios from 'axios';
import grpc from '@grpc/grpc-js';
import protoLoader from '@grpc/proto-loader';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const HTTP_BASE_URL = 'http://localhost:3000/api/v1';
const GRPC_ADDRESS = 'localhost:50051';
const PROTO_PATH = path.join(__dirname, '../grpc-shared/proto/weather.proto');

console.log('🚀 Starting comprehensive benchmark test...');
console.log('⏱️  This test includes more iterations for statistical accuracy\n');

// Load gRPC
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

const weatherProto = grpc.loadPackageDefinition(packageDefinition);

// Performance tracking
const results = {
  http: { healthChecks: [], singleRequests: [], batchRequests: [], errorHandling: [] },
  grpc: { healthChecks: [], singleRequests: [], batchRequests: [], errorHandling: [] }
};

function measureTime(fn) {
  return async (...args) => {
    const start = process.hrtime.bigint();
    try {
      const result = await fn(...args);
      const duration = Number(process.hrtime.bigint() - start) / 1_000_000; // to ms
      return { success: true, duration, result };
    } catch (error) {
      const duration = Number(process.hrtime.bigint() - start) / 1_000_000;
      return { success: false, duration, error: error.message };
    }
  };
}

// HTTP Client
const httpClient = axios.create({
  baseURL: HTTP_BASE_URL,
  timeout: 10000
});

const httpHealthCheck = measureTime(() => httpClient.get('/health'));
const httpGetWeather = measureTime((city) => httpClient.get('/weather', { params: { city } }));

// gRPC Client
const grpcClient = new weatherProto.weather.WeatherService(
  GRPC_ADDRESS,
  grpc.credentials.createInsecure()
);

const grpcHealthCheck = measureTime(() => {
  return new Promise((resolve, reject) => {
    grpcClient.HealthCheck({ service: 'weather' }, (error, response) => {
      if (error) reject(error);
      else resolve(response);
    });
  });
});

const grpcGetWeather = measureTime((city) => {
  return new Promise((resolve, reject) => {
    grpcClient.GetWeather({ city }, (error, response) => {
      if (error) reject(error);
      else resolve(response);
    });
  });
});

const grpcGetWeatherBatch = measureTime((cities) => {
  return new Promise((resolve, reject) => {
    grpcClient.GetWeatherBatch({ cities }, (error, response) => {
      if (error) reject(error);
      else resolve(response);
    });
  });
});

async function runTests() {
  console.log('💓 Testing Health Checks (20 iterations)...');
  
  // HTTP Health Checks
  for (let i = 0; i < 20; i++) {
    const result = await httpHealthCheck();
    results.http.healthChecks.push(result);
    if (i % 5 === 0) console.log(`  HTTP Health Check ${i+1}/20: ${result.duration.toFixed(2)}ms`);
  }

  // gRPC Health Checks
  for (let i = 0; i < 20; i++) {
    const result = await grpcHealthCheck();
    results.grpc.healthChecks.push(result);
    if (i % 5 === 0) console.log(`  gRPC Health Check ${i+1}/20: ${result.duration.toFixed(2)}ms`);
  }

  console.log('\n🌤️ Testing Single Weather Requests (15 iterations per city)...');
  
  const cities = ['Prague', 'London', 'Paris', 'Berlin', 'Madrid'];
  
  // HTTP Single Requests
  for (const city of cities) {
    console.log(`  Testing ${city}...`);
    for (let i = 0; i < 15; i++) {
      const result = await httpGetWeather(city);
      results.http.singleRequests.push(result);
    }
  }

  // gRPC Single Requests
  for (const city of cities) {
    for (let i = 0; i < 15; i++) {
      const result = await grpcGetWeather(city);
      results.grpc.singleRequests.push(result);
    }
  }

  console.log('\n🌍 Testing Batch Weather Requests (10 iterations)...');
  
  const batchCities = ['Prague', 'London', 'Paris', 'Berlin', 'Madrid', 'Rome'];
  
  // gRPC Batch Requests
  for (let i = 0; i < 10; i++) {
    const batchResult = await grpcGetWeatherBatch(batchCities);
    results.grpc.batchRequests.push(batchResult);
    if (i % 3 === 0) console.log(`  gRPC Batch ${i+1}/10: ${batchResult.duration.toFixed(2)}ms`);
  }
  
  // HTTP "Batch" Requests (parallel)
  for (let i = 0; i < 10; i++) {
    const start = process.hrtime.bigint();
    const httpBatchPromises = batchCities.map(city => 
      httpGetWeather(city).catch(e => ({ success: false, duration: 0, error: e.message }))
    );
    const httpBatchResults = await Promise.all(httpBatchPromises);
    const batchDuration = Number(process.hrtime.bigint() - start) / 1_000_000;
    
    results.http.batchRequests.push({
      success: httpBatchResults.every(r => r.success),
      duration: batchDuration,
      individualResults: httpBatchResults
    });
    if (i % 3 === 0) console.log(`  HTTP Batch ${i+1}/10: ${batchDuration.toFixed(2)}ms`);
  }

  console.log('\n❌ Testing Error Handling (invalid cities, 10 iterations)...');
  
  // Test with invalid city
  const invalidCity = 'InvalidCity12345';
  
  // HTTP Error Handling
  for (let i = 0; i < 10; i++) {
    const result = await httpGetWeather(invalidCity);
    results.http.errorHandling.push(result);
    if (i % 3 === 0) console.log(`  HTTP Error ${i+1}/10: ${result.duration.toFixed(2)}ms - ${result.success ? '✅' : '❌'}`);
  }

  // gRPC Error Handling
  for (let i = 0; i < 10; i++) {
    const result = await grpcGetWeather(invalidCity);
    results.grpc.errorHandling.push(result);
    if (i % 3 === 0) console.log(`  gRPC Error ${i+1}/10: ${result.duration.toFixed(2)}ms - ${result.success ? '✅' : '❌'}`);
  }

  // Calculate and display results
  console.log('\n📊 COMPREHENSIVE BENCHMARK RESULTS');
  console.log('='.repeat(60));
  
  const calculateStats = (measurements) => {
    const durations = measurements.map(m => m.duration);
    const successCount = measurements.filter(m => m.success).length;
    
    return {
      avg: durations.reduce((a, b) => a + b, 0) / durations.length,
      min: Math.min(...durations),
      max: Math.max(...durations),
      median: durations.sort((a, b) => a - b)[Math.floor(durations.length / 2)],
      p95: durations.sort((a, b) => a - b)[Math.floor(durations.length * 0.95)],
      successRate: (successCount / measurements.length) * 100,
      total: measurements.length,
      stdDev: Math.sqrt(durations.reduce((sum, d) => sum + Math.pow(d - (durations.reduce((a, b) => a + b, 0) / durations.length), 2), 0) / durations.length)
    };
  };

  const report = {
    timestamp: new Date().toISOString(),
    testConfiguration: {
      healthCheckIterations: 20,
      singleRequestIterations: 75, // 15 * 5 cities
      batchRequestIterations: 10,
      errorHandlingIterations: 10,
      cities: ['Prague', 'London', 'Paris', 'Berlin', 'Madrid'],
      batchCities: ['Prague', 'London', 'Paris', 'Berlin', 'Madrid', 'Rome']
    },
    summary: {
      http: {
        healthChecks: calculateStats(results.http.healthChecks),
        singleRequests: calculateStats(results.http.singleRequests),
        batchRequests: calculateStats(results.http.batchRequests),
        errorHandling: calculateStats(results.http.errorHandling)
      },
      grpc: {
        healthChecks: calculateStats(results.grpc.healthChecks),
        singleRequests: calculateStats(results.grpc.singleRequests),
        batchRequests: calculateStats(results.grpc.batchRequests),
        errorHandling: calculateStats(results.grpc.errorHandling)
      }
    }
  };

  // Print detailed summary
  ['http', 'grpc'].forEach(protocol => {
    console.log(`\n${protocol.toUpperCase()} DETAILED RESULTS:`);
    Object.entries(report.summary[protocol]).forEach(([operation, stats]) => {
      console.log(`  ${operation}:`);
      console.log(`    Average: ${stats.avg.toFixed(2)}ms`);
      console.log(`    Median: ${stats.median.toFixed(2)}ms`);
      console.log(`    Min: ${stats.min.toFixed(2)}ms`);
      console.log(`    Max: ${stats.max.toFixed(2)}ms`);
      console.log(`    95th Percentile: ${stats.p95.toFixed(2)}ms`);
      console.log(`    Std Deviation: ${stats.stdDev.toFixed(2)}ms`);
      console.log(`    Success Rate: ${stats.successRate.toFixed(1)}%`);
      console.log(`    Total Tests: ${stats.total}`);
    });
  });

  // Performance comparison
  console.log('\n🏆 DETAILED COMPARISON (HTTP vs gRPC):');
  console.log('-'.repeat(50));
  Object.keys(report.summary.http).forEach(operation => {
    const httpStats = report.summary.http[operation];
    const grpcStats = report.summary.grpc[operation];
    
    console.log(`\n${operation.toUpperCase()}:`);
    
    // Average comparison
    const avgImprovement = ((httpStats.avg - grpcStats.avg) / httpStats.avg * 100);
    const avgWinner = avgImprovement > 0 ? 'gRPC' : 'HTTP';
    console.log(`  Average: ${avgWinner} is ${Math.abs(avgImprovement).toFixed(1)}% faster`);
    
    // Median comparison
    const medianImprovement = ((httpStats.median - grpcStats.median) / httpStats.median * 100);
    const medianWinner = medianImprovement > 0 ? 'gRPC' : 'HTTP';
    console.log(`  Median: ${medianWinner} is ${Math.abs(medianImprovement).toFixed(1)}% faster`);
    
    // P95 comparison
    const p95Improvement = ((httpStats.p95 - grpcStats.p95) / httpStats.p95 * 100);
    const p95Winner = p95Improvement > 0 ? 'gRPC' : 'HTTP';
    console.log(`  95th Percentile: ${p95Winner} is ${Math.abs(p95Improvement).toFixed(1)}% faster`);
    
    // Consistency comparison
    const httpCoV = httpStats.stdDev / httpStats.avg; // Coefficient of Variation
    const grpcCoV = grpcStats.stdDev / grpcStats.avg;
    const consistencyWinner = httpCoV < grpcCoV ? 'HTTP' : 'gRPC';
    console.log(`  Consistency: ${consistencyWinner} is more consistent (lower CoV)`);
  });

  // Throughput analysis
  console.log('\n📈 THROUGHPUT ANALYSIS:');
  console.log('-'.repeat(30));
  
  const httpSingleThroughput = 1000 / report.summary.http.singleRequests.avg; // requests per second
  const grpcSingleThroughput = 1000 / report.summary.grpc.singleRequests.avg;
  
  console.log(`Single Request Throughput:`);
  console.log(`  HTTP: ${httpSingleThroughput.toFixed(2)} req/sec`);
  console.log(`  gRPC: ${grpcSingleThroughput.toFixed(2)} req/sec`);
  console.log(`  gRPC advantage: ${((grpcSingleThroughput - httpSingleThroughput) / httpSingleThroughput * 100).toFixed(1)}%`);

  // Save comprehensive results
  const cleanResults = {
    timestamp: report.timestamp,
    testConfiguration: report.testConfiguration,
    summary: report.summary,
    detailed: {
      http: {
        healthChecks: results.http.healthChecks.map(r => ({ duration: r.duration, success: r.success })),
        singleRequests: results.http.singleRequests.map(r => ({ duration: r.duration, success: r.success })),
        batchRequests: results.http.batchRequests.map(r => ({ duration: r.duration, success: r.success })),
        errorHandling: results.http.errorHandling.map(r => ({ duration: r.duration, success: r.success }))
      },
      grpc: {
        healthChecks: results.grpc.healthChecks.map(r => ({ duration: r.duration, success: r.success })),
        singleRequests: results.grpc.singleRequests.map(r => ({ duration: r.duration, success: r.success })),
        batchRequests: results.grpc.batchRequests.map(r => ({ duration: r.duration, success: r.success })),
        errorHandling: results.grpc.errorHandling.map(r => ({ duration: r.duration, success: r.success }))
      }
    }
  };
  
  fs.writeFileSync('comprehensive-benchmark-results.json', JSON.stringify(cleanResults, null, 2));
  console.log('\n💾 Comprehensive results saved to comprehensive-benchmark-results.json');

  grpcClient.close();
  console.log('\n✅ Comprehensive benchmark completed successfully!');
  console.log('📋 Summary saved to comprehensive-benchmark-results.json');
  console.log('📄 Check docs/PERFORMANCE_ANALYSIS.md for detailed analysis');
}

runTests().catch(error => {
  console.error('❌ Benchmark failed:', error);
  grpcClient.close();
  process.exit(1);
});
