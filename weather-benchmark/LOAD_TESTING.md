# Load Testing Guide: HTTP vs gRPC Under Production Load

## 🎯 Overview

Цей load test симулює production навантаження згідно з системними вимогами:
- **Target:** 1000 RPS (requests per second)
- **Duration:** 30 секунд активного навантаження
- **Ramp-up:** 10 секунд поступового збільшення навантаження
- **Concurrent connections:** До 100 одночасних з'єднань

## ⚠️ Prerequisites

### System Requirements
```bash
# Мінімальні системні вимоги для load testing:
CPU: 4+ cores
RAM: 8GB+
Network: Stable localhost connection
```

### Weather Service Setup
```bash
# 1. Запустіть Weather Service
cd ../weather-service
npm run dev

# 2. Перевірте доступність обох API:
curl http://localhost:3000/api/v1/health    # HTTP
# gRPC endpoint: localhost:50051 (перевірте логи сервісу)
```

### System Monitoring
Load test автоматично моніторить:
- CPU usage (%)
- Memory usage (%)
- Network connections
- System load average

## 🚀 Running Load Tests

### Quick Start
```bash
cd weather-benchmark
npm run load-test
```

### Test Configuration
```javascript
const LOAD_TEST_CONFIG = {
  targetRPS: 1000,              // Target requests per second
  testDurationSeconds: 30,       // Test duration
  rampUpSeconds: 10,            // Gradual load increase
  maxConcurrency: 100           // Max concurrent connections
};
```

### Customization
Редагуйте `load-test.js` для налаштування:
```javascript
// Modify test parameters
LOAD_TEST_CONFIG.targetRPS = 500;        // Lower load
LOAD_TEST_CONFIG.testDurationSeconds = 60; // Longer test
```

## 📊 Understanding Results

### Key Metrics
```
📊 LOAD TEST RESULTS
==========================================================

HTTP LOAD TEST RESULTS:
  Target RPS: 1000
  Actual RPS: 847.32              ← Досягнута швидкість
  Total Requests: 25420           ← Загальна кількість запитів
  Successful: 25398               ← Успішні запити
  Failed: 22                      ← Невдалі запити
  Error Rate: 0.09%               ← Відсоток помилок
  Average Latency: 45.67ms        ← Середня затримка
  P95 Latency: 89.34ms           ← 95-й перцентиль
  P99 Latency: 156.78ms          ← 99-й перцентиль
```

### Performance Indicators
| Metric | Good | Warning | Critical |
|--------|------|---------|----------|
| **RPS Achievement** | >90% of target | 70-90% | <70% |
| **Error Rate** | <1% | 1-5% | >5% |
| **P95 Latency** | <200ms | 200-500ms | >500ms |
| **P99 Latency** | <500ms | 500ms-1s | >1s |

### System Requirements Compliance
```
📋 SYSTEM REQUIREMENTS COMPLIANCE:
Target: 1000 RPS (system requirement)
HTTP Achievement: 84.7% (847 RPS)     ← Compliance percentage
gRPC Achievement: 92.1% (921 RPS)     
✅ gRPC meets system requirements
⚠️  HTTP below target under load
```

## 🔍 Troubleshooting

### Common Issues

#### 1. Low RPS Achievement (<70%)
```
Possible causes:
- CPU bottleneck (check system monitor)
- Memory pressure
- Network saturation
- Weather Service overload

Solutions:
- Reduce concurrent connections
- Increase test duration
- Optimize Weather Service
- Check external API rate limits
```

#### 2. High Error Rate (>5%)
```
Common errors:
- Connection timeouts
- HTTP 503 Service Unavailable
- gRPC UNAVAILABLE errors
- External API failures

Solutions:
- Implement connection pooling
- Add retry logic
- Check Weather Service logs
- Verify external API status
```

#### 3. High Latency (P95 >500ms)
```
Symptoms:
- Slow response times
- Degraded user experience
- Potential timeouts

Solutions:
- Add caching
- Optimize database queries
- Scale horizontally
- Use CDN for static content
```

### System Resource Warnings
```
💻 SYSTEM RESOURCE REPORT:
⚠️  WARNING: High CPU usage detected (>90%)
⚠️  WARNING: High memory usage detected (>90%)
⚠️  WARNING: Average CPU usage is high (>70%)
```

## 📈 Optimization Recommendations

### For HTTP REST API
```javascript
// Connection pooling
const httpAgent = new http.Agent({
  keepAlive: true,
  maxSockets: 100,
  maxFreeSockets: 50,
  timeout: 5000
});

// Request batching
const batchRequests = cities.map(city => 
  axios.get(`/weather?city=${city}`)
);
const results = await Promise.all(batchRequests);
```

### For gRPC API
```javascript
// Connection pooling
const channelOptions = {
  'grpc.keepalive_time_ms': 30000,
  'grpc.keepalive_timeout_ms': 5000,
  'grpc.max_connection_idle_ms': 60000,
  'grpc.max_connection_age_ms': 300000
};

// Use streaming for high-frequency requests
const stream = client.streamWeather();
stream.write({ city: 'Prague' });
stream.write({ city: 'London' });
```

### Weather Service Optimizations
```javascript
// Add request rate limiting
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000 // limit each IP to 1000 requests per windowMs
});

// Implement caching
import Redis from 'redis';
const redis = Redis.createClient();

// Cache weather data for 5 minutes
const cacheKey = `weather:${city}`;
const cached = await redis.get(cacheKey);
if (cached) return JSON.parse(cached);
```

## 🎯 Production Recommendations

### Based on Load Test Results

#### If HTTP performs better:
- Use HTTP for public APIs
- Implement HTTP/2 for multiplexing
- Add aggressive caching
- Use CDN for geographical distribution

#### If gRPC performs better:
- Use gRPC for internal services
- Implement streaming for bulk operations
- Add connection pooling
- Use load balancers with gRPC support

#### Hybrid Approach (Recommended):
```
Frontend → HTTP REST API (public interface)
    ↓
API Gateway → gRPC (internal communication)
    ↓
Microservices (Weather Service, Email Service, etc.)
```

### Monitoring in Production
```javascript
// Add metrics collection
import prometheus from 'prom-client';

const httpRequestDuration = new prometheus.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code']
});

const grpcRequestDuration = new prometheus.Histogram({
  name: 'grpc_request_duration_seconds',
  help: 'Duration of gRPC requests in seconds',
  labelNames: ['method', 'status']
});
```

## 📁 Generated Files

After running load tests:
- `load-test-results.json` - Detailed performance metrics
- `system-monitoring-report.json` - System resource usage
- Console output with real-time statistics

## 🔗 Related Documentation

- [Performance Analysis](../docs/PERFORMANCE_ANALYSIS.md) - Detailed comparison
- [System Design Document](../docs/sdd/Weather%20Subscription%20API.md) - Requirements
- [Architecture Decisions](../docs/adr/) - Technical decisions
