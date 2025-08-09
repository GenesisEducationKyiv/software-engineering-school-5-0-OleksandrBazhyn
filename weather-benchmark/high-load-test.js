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

console.log('⚡ HIGH LOAD SIMULATION: HTTP vs gRPC');
console.log('🎯 Target: Simulating high concurrent load\n');

// Load gRPC
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

const weatherProto = grpc.loadPackageDefinition(packageDefinition);

// Test configuration
const config = {
  concurrentUsers: 50,        // Simulate 50 concurrent users
  requestsPerUser: 20,        // Each user makes 20 requests
  testDurationMs: 10000,      // 10 seconds of testing
  cities: ['Prague', 'London', 'Paris', 'Berlin', 'Madrid']
};

console.log(`📋 Test Configuration:`);
console.log(`   Concurrent Users: ${config.concurrentUsers}`);
console.log(`   Requests per User: ${config.requestsPerUser}`);
console.log(`   Total Requests: ${config.concurrentUsers * config.requestsPerUser} per protocol`);
console.log(`   Test Duration: ${config.testDurationMs / 1000} seconds\n`);

// Results tracking
const results = {
  http: { successes: 0, failures: 0, totalTime: 0, latencies: [] },
  grpc: { successes: 0, failures: 0, totalTime: 0, latencies: [] }
};

// HTTP client
const httpClient = axios.create({
  baseURL: HTTP_BASE_URL,
  timeout: 5000
});

// gRPC client pool
const grpcClients = [];
for (let i = 0; i < 10; i++) {
  grpcClients.push(new weatherProto.weather.WeatherService(
    GRPC_ADDRESS,
    grpc.credentials.createInsecure()
  ));
}

function getRandomCity() {
  return config.cities[Math.floor(Math.random() * config.cities.length)];
}

function getGrpcClient() {
  return grpcClients[Math.floor(Math.random() * grpcClients.length)];
}

async function httpRequest() {
  const start = Date.now();
  try {
    const city = getRandomCity();
    await httpClient.get('/weather', { params: { city } });
    const latency = Date.now() - start;
    results.http.successes++;
    results.http.latencies.push(latency);
    results.http.totalTime += latency;
  } catch (error) {
    results.http.failures++;
    const latency = Date.now() - start;
    results.http.totalTime += latency;
  }
}

async function grpcRequest() {
  const start = Date.now();
  try {
    const city = getRandomCity();
    const client = getGrpcClient();
    
    await new Promise((resolve, reject) => {
      client.GetWeather({ city }, (error, response) => {
        if (error) reject(error);
        else resolve(response);
      });
    });
    
    const latency = Date.now() - start;
    results.grpc.successes++;
    results.grpc.latencies.push(latency);
    results.grpc.totalTime += latency;
  } catch (error) {
    results.grpc.failures++;
    const latency = Date.now() - start;
    results.grpc.totalTime += latency;
  }
}

async function simulateUser(protocol, requestCount) {
  const requests = [];
  for (let i = 0; i < requestCount; i++) {
    if (protocol === 'http') {
      requests.push(httpRequest());
    } else {
      requests.push(grpcRequest());
    }
  }
  await Promise.all(requests);
}

async function runLoadSimulation() {
  console.log('🚀 Starting HTTP load simulation...');
  const httpStart = Date.now();
  
  // Create concurrent users for HTTP
  const httpUsers = [];
  for (let i = 0; i < config.concurrentUsers; i++) {
    httpUsers.push(simulateUser('http', config.requestsPerUser));
  }
  
  await Promise.all(httpUsers);
  const httpDuration = Date.now() - httpStart;
  
  console.log('✅ HTTP simulation completed');
  
  // Cool down
  console.log('⏱️  Cooling down for 3 seconds...');
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  console.log('🚀 Starting gRPC load simulation...');
  const grpcStart = Date.now();
  
  // Create concurrent users for gRPC
  const grpcUsers = [];
  for (let i = 0; i < config.concurrentUsers; i++) {
    grpcUsers.push(simulateUser('grpc', config.requestsPerUser));
  }
  
  await Promise.all(grpcUsers);
  const grpcDuration = Date.now() - grpcStart;
  
  console.log('✅ gRPC simulation completed');
  
  // Calculate and display results
  console.log('\n📊 HIGH LOAD SIMULATION RESULTS');
  console.log('='.repeat(50));
  
  const totalHttpRequests = results.http.successes + results.http.failures;
  const totalGrpcRequests = results.grpc.successes + results.grpc.failures;
  
  const httpRPS = totalHttpRequests / (httpDuration / 1000);
  const grpcRPS = totalGrpcRequests / (grpcDuration / 1000);
  
  const httpAvgLatency = results.http.totalTime / totalHttpRequests;
  const grpcAvgLatency = results.grpc.totalTime / totalGrpcRequests;
  
  // Calculate percentiles
  const httpSortedLatencies = results.http.latencies.sort((a, b) => a - b);
  const grpcSortedLatencies = results.grpc.latencies.sort((a, b) => a - b);
  
  const httpP95 = httpSortedLatencies[Math.floor(httpSortedLatencies.length * 0.95)] || 0;
  const grpcP95 = grpcSortedLatencies[Math.floor(grpcSortedLatencies.length * 0.95)] || 0;
  
  console.log('HTTP RESULTS:');
  console.log(`  Total Requests: ${totalHttpRequests}`);
  console.log(`  Successful: ${results.http.successes}`);
  console.log(`  Failed: ${results.http.failures}`);
  console.log(`  Success Rate: ${(results.http.successes / totalHttpRequests * 100).toFixed(1)}%`);
  console.log(`  RPS: ${httpRPS.toFixed(2)}`);
  console.log(`  Average Latency: ${httpAvgLatency.toFixed(2)}ms`);
  console.log(`  P95 Latency: ${httpP95}ms`);
  console.log(`  Test Duration: ${httpDuration}ms`);
  
  console.log('\ngRPC RESULTS:');
  console.log(`  Total Requests: ${totalGrpcRequests}`);
  console.log(`  Successful: ${results.grpc.successes}`);
  console.log(`  Failed: ${results.grpc.failures}`);
  console.log(`  Success Rate: ${(results.grpc.successes / totalGrpcRequests * 100).toFixed(1)}%`);
  console.log(`  RPS: ${grpcRPS.toFixed(2)}`);
  console.log(`  Average Latency: ${grpcAvgLatency.toFixed(2)}ms`);
  console.log(`  P95 Latency: ${grpcP95}ms`);
  console.log(`  Test Duration: ${grpcDuration}ms`);
  
  console.log('\n🏆 COMPARISON:');
  console.log(`  RPS: ${grpcRPS > httpRPS ? 'gRPC' : 'HTTP'} wins (${Math.abs(grpcRPS - httpRPS).toFixed(2)} difference)`);
  console.log(`  Latency: ${grpcAvgLatency < httpAvgLatency ? 'gRPC' : 'HTTP'} wins (${Math.abs(grpcAvgLatency - httpAvgLatency).toFixed(2)}ms difference)`);
  console.log(`  Success Rate: ${results.grpc.successes/totalGrpcRequests > results.http.successes/totalHttpRequests ? 'gRPC' : 'HTTP'} wins`);
  
  // System requirements analysis
  console.log('\n📋 SYSTEM REQUIREMENTS ANALYSIS:');
  console.log(`  Target (from system design): 1000 RPS`);
  console.log(`  HTTP achieved: ${httpRPS.toFixed(2)} RPS (${(httpRPS/1000*100).toFixed(1)}% of target)`);
  console.log(`  gRPC achieved: ${grpcRPS.toFixed(2)} RPS (${(grpcRPS/1000*100).toFixed(1)}% of target)`);
  
  if (httpRPS >= 1000 || grpcRPS >= 1000) {
    console.log('✅ At least one protocol meets 1000 RPS requirement');
  } else {
    console.log('⚠️  Neither protocol achieved 1000 RPS in this simulation');
    console.log('   Note: This is a simplified test. Real performance may vary.');
  }
  
  // Latency requirements check (< 200ms per system design)
  console.log('\n📐 LATENCY REQUIREMENTS (<200ms):');
  console.log(`  HTTP P95: ${httpP95}ms ${httpP95 < 200 ? '✅' : '❌'}`);
  console.log(`  gRPC P95: ${grpcP95}ms ${grpcP95 < 200 ? '✅' : '❌'}`);
  
  // Save results
  const simulationResults = {
    timestamp: new Date().toISOString(),
    configuration: config,
    systemRequirements: {
      targetRPS: 1000,
      maxLatency: '200ms'
    },
    results: {
      http: {
        totalRequests: totalHttpRequests,
        successful: results.http.successes,
        failed: results.http.failures,
        successRate: results.http.successes / totalHttpRequests * 100,
        rps: httpRPS,
        avgLatency: httpAvgLatency,
        p95Latency: httpP95,
        duration: httpDuration
      },
      grpc: {
        totalRequests: totalGrpcRequests,
        successful: results.grpc.successes,
        failed: results.grpc.failures,
        successRate: results.grpc.successes / totalGrpcRequests * 100,
        rps: grpcRPS,
        avgLatency: grpcAvgLatency,
        p95Latency: grpcP95,
        duration: grpcDuration
      }
    }
  };
  
  fs.writeFileSync('high-load-simulation-results.json', JSON.stringify(simulationResults, null, 2));
  console.log('\n💾 Results saved to high-load-simulation-results.json');
  
  // Cleanup
  grpcClients.forEach(client => client.close());
  console.log('\n🎉 High load simulation completed!');
}

runLoadSimulation().catch(error => {
  console.error('❌ Load simulation failed:', error);
  grpcClients.forEach(client => client.close());
  process.exit(1);
});
