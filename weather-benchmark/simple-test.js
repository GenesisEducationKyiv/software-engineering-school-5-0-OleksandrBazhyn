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

console.log('🚀 Starting simple benchmark test...');

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
  http: { healthChecks: [], singleRequests: [], batchRequests: [] },
  grpc: { healthChecks: [], singleRequests: [], batchRequests: [] }
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
  console.log('💓 Testing Health Checks...');
  
  // HTTP Health Checks (5 iterations)
  for (let i = 0; i < 5; i++) {
    const result = await httpHealthCheck();
    results.http.healthChecks.push(result);
    console.log(`HTTP Health Check ${i+1}: ${result.duration.toFixed(2)}ms - ${result.success ? '✅' : '❌'}`);
  }

  // gRPC Health Checks (5 iterations)
  for (let i = 0; i < 5; i++) {
    const result = await grpcHealthCheck();
    results.grpc.healthChecks.push(result);
    console.log(`gRPC Health Check ${i+1}: ${result.duration.toFixed(2)}ms - ${result.success ? '✅' : '❌'}`);
  }

  console.log('\n🌤️ Testing Single Weather Requests...');
  
  const cities = ['Prague', 'London', 'Paris'];
  
  // HTTP Single Requests
  for (const city of cities) {
    const result = await httpGetWeather(city);
    results.http.singleRequests.push(result);
    console.log(`HTTP Weather for ${city}: ${result.duration.toFixed(2)}ms - ${result.success ? '✅' : '❌'}`);
  }

  // gRPC Single Requests
  for (const city of cities) {
    const result = await grpcGetWeather(city);
    results.grpc.singleRequests.push(result);
    console.log(`gRPC Weather for ${city}: ${result.duration.toFixed(2)}ms - ${result.success ? '✅' : '❌'}`);
  }

  console.log('\n🌍 Testing Batch Weather Request...');
  
  // gRPC Batch Request
  const batchResult = await grpcGetWeatherBatch(['Prague', 'London', 'Paris', 'Berlin']);
  results.grpc.batchRequests.push(batchResult);
  console.log(`gRPC Batch Request: ${batchResult.duration.toFixed(2)}ms - ${batchResult.success ? '✅' : '❌'}`);
  
  // Simulate HTTP "batch" with parallel requests
  const start = process.hrtime.bigint();
  const httpBatchPromises = ['Prague', 'London', 'Paris', 'Berlin'].map(city => 
    httpGetWeather(city).catch(e => ({ success: false, duration: 0, error: e.message }))
  );
  const httpBatchResults = await Promise.all(httpBatchPromises);
  const batchDuration = Number(process.hrtime.bigint() - start) / 1_000_000;
  
  results.http.batchRequests.push({
    success: httpBatchResults.every(r => r.success),
    duration: batchDuration,
    individualResults: httpBatchResults
  });
  console.log(`HTTP "Batch" (parallel): ${batchDuration.toFixed(2)}ms - ${httpBatchResults.every(r => r.success) ? '✅' : '❌'}`);

  // Calculate and display results
  console.log('\n📊 BENCHMARK RESULTS');
  console.log('='.repeat(50));
  
  const calculateStats = (measurements) => {
    const durations = measurements.map(m => m.duration);
    const successCount = measurements.filter(m => m.success).length;
    
    return {
      avg: durations.reduce((a, b) => a + b, 0) / durations.length,
      min: Math.min(...durations),
      max: Math.max(...durations),
      successRate: (successCount / measurements.length) * 100,
      total: measurements.length
    };
  };

  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      http: {
        healthChecks: calculateStats(results.http.healthChecks),
        singleRequests: calculateStats(results.http.singleRequests),
        batchRequests: calculateStats(results.http.batchRequests)
      },
      grpc: {
        healthChecks: calculateStats(results.grpc.healthChecks),
        singleRequests: calculateStats(results.grpc.singleRequests),
        batchRequests: calculateStats(results.grpc.batchRequests)
      }
    },
    detailed: results
  };

  // Print summary
  ['http', 'grpc'].forEach(protocol => {
    console.log(`\n${protocol.toUpperCase()} RESULTS:`);
    Object.entries(report.summary[protocol]).forEach(([operation, stats]) => {
      console.log(`  ${operation}:`);
      console.log(`    Average: ${stats.avg.toFixed(2)}ms`);
      console.log(`    Min: ${stats.min.toFixed(2)}ms`);
      console.log(`    Max: ${stats.max.toFixed(2)}ms`);
      console.log(`    Success Rate: ${stats.successRate.toFixed(1)}%`);
      console.log(`    Total Tests: ${stats.total}`);
    });
  });

  // Comparison
  console.log('\n🏆 COMPARISON (HTTP vs gRPC):');
  console.log('-'.repeat(30));
  Object.keys(report.summary.http).forEach(operation => {
    const httpAvg = report.summary.http[operation].avg;
    const grpcAvg = report.summary.grpc[operation].avg;
    
    const improvement = ((httpAvg - grpcAvg) / httpAvg * 100);
    const winner = improvement > 0 ? 'gRPC' : 'HTTP';
    const percentage = Math.abs(improvement).toFixed(1);
    
    console.log(`${operation}: ${winner} is ${percentage}% faster`);
  });

  // Save results (clean data without circular references)
  const cleanResults = {
    timestamp: report.timestamp,
    summary: report.summary,
    detailed: {
      http: {
        healthChecks: results.http.healthChecks.map(r => ({ duration: r.duration, success: r.success })),
        singleRequests: results.http.singleRequests.map(r => ({ duration: r.duration, success: r.success })),
        batchRequests: results.http.batchRequests.map(r => ({ duration: r.duration, success: r.success }))
      },
      grpc: {
        healthChecks: results.grpc.healthChecks.map(r => ({ duration: r.duration, success: r.success })),
        singleRequests: results.grpc.singleRequests.map(r => ({ duration: r.duration, success: r.success })),
        batchRequests: results.grpc.batchRequests.map(r => ({ duration: r.duration, success: r.success }))
      }
    }
  };
  
  fs.writeFileSync('benchmark-results.json', JSON.stringify(cleanResults, null, 2));
  console.log('\n💾 Results saved to benchmark-results.json');

  grpcClient.close();
  console.log('\n✅ Benchmark completed successfully!');
}

runTests().catch(error => {
  console.error('❌ Benchmark failed:', error);
  grpcClient.close();
  process.exit(1);
});
