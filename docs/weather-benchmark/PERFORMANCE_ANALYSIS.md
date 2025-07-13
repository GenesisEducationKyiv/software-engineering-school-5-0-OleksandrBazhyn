# Performance Analysis: HTTP REST API vs gRPC

**Дата аналізу:** 13 липня 2025  
**Версія Weather Service:** 1.0.0  
**Тестове середовище:** Windows, localhost

## Огляд

Цей документ містить детальний аналіз продуктивності Weather Service API, порівнюючи два протоколи зв'язку:
- **HTTP REST API** (Express.js на порту 3000)
- **gRPC API** (gRPC Server на порту 50051)

## Методологія тестування


### Тестове середовище
- **Платформа:** Windows, Node.js
- **Сервіси:** Weather Service (HTTP + gRPC)
- **Кешування:** Redis відключений (для чистих вимірювань API)
- **Мережа:** localhost (без мережевих затримок)

### Типи тестів

#### 1. **Базове тестування продуктивності**
- **Мета:** Порівняння latency та throughput у контрольованих умовах
- **Навантаження:** 5-75 запитів за операцію
- **Операції:** Health checks, single requests, batch requests, error handling

#### 2. **Load Testing (відповідно до системних вимог)**
- **Мета:** Перевірка відповідності системним вимогам під навантаженням
- **Навантаження:** 1000 RPS (requests per second) відповідно до [System Design Document](../sdd/Weather%20Subscription%20API.md)
- **Тривалість:** 30 секунд активного навантаження + 10 секунд ramp-up
- **Моніторинг:** Автоматичний моніторинг системних ресурсів (CPU, Memory)

### Операції що тестувались
1. **Health Check** - перевірка стану сервісу
2. **Single Requests** - отримання погоди для одного міста
3. **Batch Requests** - отримання погоди для кількох міст
4. **Error Handling** - обробка помилок для неіснуючих міст

### Метрики
- **Latency (затримка)** - час відгуку в мілісекундах (P50, P95, P99)
- **Throughput** - requests per second (RPS)
- **Success Rate** - відсоток успішних запитів
- **Error Rate** - відсоток невдалих запитів
- **Resource Usage** - CPU та Memory під навантаженням
- **System Requirements Compliance** - відповідність цільовим 1000 RPS

## Результати тестування

### Тестова конфігурація
- **Health Check:** 20 ітерацій
- **Single Requests:** 75 ітерацій (15 на кожне з 5 міст)
- **Batch Requests:** 10 ітерацій (6 міст в batch)
- **Error Handling:** 10 ітерацій з неіснуючим містом

### Health Check Performance

| Метрика | HTTP REST | gRPC | Переможець |
|---------|-----------|------|------------|
| **Середній час** | 1.93ms | 2.40ms | **HTTP (24.1% швидше)** |
| **Медіана** | 1.24ms | 1.27ms | HTTP (2.3% швидше) |
| **95-й перцентиль** | 15.66ms | 20.95ms | **HTTP (33.7% швидше)** |
| **Стандартне відхилення** | 3.23ms | 4.28ms | **HTTP (більш стабільно)** |
| **Success Rate** | 100% | 100% | Рівність |

### Single Weather Requests Performance

| Метрика | HTTP REST | gRPC | Переможець |
|---------|-----------|------|------------|
| **Середній час** | 43.26ms | 42.47ms | **gRPC (1.8% швидше)** |
| **Медіана** | 40.22ms | 40.59ms | HTTP (0.9% швидше) |
| **95-й перцентиль** | 57.74ms | 54.16ms | **gRPC (6.2% швидше)** |
| **Стандартне відхилення** | 13.86ms | 7.09ms | **gRPC (більш стабільно)** |
| **Min/Max розбіжність** | 106.51ms | 41.81ms | **gRPC (більш передбачувано)** |
| **Success Rate** | 100% | 100% | Рівність |

### Batch Requests Performance

| Метрика | HTTP REST | gRPC | Переможець |
|---------|-----------|------|------------|
| **Середній час** | 49.74ms | 57.83ms | **HTTP (16.3% швидше)** |
| **Медіана** | 45.62ms | 44.32ms | gRPC (2.8% швидше) |
| **95-й перцентиль** | 87.04ms | 140.70ms | **HTTP (61.7% швидше)** |
| **Підхід** | Parallel requests | Native batch API | - |
| **Success Rate** | 100% | 100% | Рівність |

### Error Handling Performance

| Метрика | HTTP REST | gRPC | Переможець |
|---------|-----------|------|------------|
| **Середній час** | 81.05ms | 71.85ms | **gRPC (11.4% швидше)** |
| **Медіана** | 71.63ms | 71.68ms | HTTP (0.1% швидше) |
| **95-й перцентиль** | 163.52ms | 72.75ms | **gRPC (55.5% швидше)** |
| **Стандартне відхилення** | 27.50ms | 0.53ms | **gRPC (значно стабільніше)** |
| **Success Rate** | 0% (expected) | 100% (graceful) | **gRPC (кращий error handling)** |

### High-Load Performance (1000 concurrent requests)

| Метрика | HTTP REST | gRPC | Переможець |
|---------|-----------|------|------------|
| **Actual RPS** | 263.50 | 984.25 | **gRPC (273% швидше)** |
| **Target Achievement** | 26.4% | 98.4% | **gRPC (майже досягає 1000 RPS)** |
| **Success Rate** | 100% | 100% | Рівність |
| **Average Latency** | 3540ms | 946ms | **gRPC (73% швидше)** |
| **P95 Latency** | 3661ms | 993ms | **gRPC (73% швидше)** |
| **System Requirements** | ❌ Не відповідає | ✅ Майже відповідає | **gRPC** |

**Критичні висновки під навантаженням:**
- **gRPC демонструє кардинально кращу продуктивність** під високим навантаженням
- **HTTP значно деградує** при збільшенні concurrent connections (з ~40ms до 3500ms)
- **gRPC залишається стабільним** навіть при 1000 одночасних запитах
- **Системні вимоги:** Тільки gRPC наближається до цільових 1000 RPS

### Throughput Analysis

| Протокол | Low Load RPS | High Load RPS | Degradation | Scalability |
|----------|--------------|---------------|-------------|-------------|
| **HTTP REST** | 23.11 req/sec | 263.50 req/sec | Майже не змінився | Обмежений |
| **gRPC** | 23.55 req/sec | 984.25 req/sec | **+4000% improvement** | **Відмінний** |

## Детальний аналіз

### 1. Health Check Performance
- **HTTP має перевагу** в простих операціях (24% швидше в середньому)
- **Менше накладних витрат** на REST endpoint порівняно з protobuf серіалізацією
- **Менша варіативність** у HTTP (коефіцієнт варіації нижчий)
- **Рекомендація:** HTTP для health checks та monitoring

### 2. Single Weather Requests
- **gRPC незначно переважає** в середньому часі (1.8% швидше)
- **Значно кращі у стабільності:** стандартне відхилення 7.09ms vs 13.86ms
- **Кращий worst-case performance:** 95-й перцентиль на 6.2% швидше
- **Менший розбіжність min/max:** 41.81ms vs 106.51ms у HTTP
- **Рекомендація:** gRPC для high-frequency операцій де важлива передбачуваність

### 3. Batch Requests
- **HTTP суттєво переважає** завдяки паралельному виконанню (16.3% швидше)
- **JavaScript concurrency model** дозволяє ефективний Promise.all()
- **gRPC batch API** виконується послідовно, що менш ефективно
- **HTTP стабільніший** в 95-му перцентилі (61.7% швидше)
- **Рекомендація:** HTTP для batch операцій

### 4. Error Handling
- **gRPC значно переважає:** стабільніший та швидший error handling
- **Graceful error responses:** gRPC повертає structured error, HTTP кидає exception
- **Стабільність:** стандартне відхилення 0.53ms vs 27.50ms у HTTP
- **95-й перцентиль:** gRPC на 55.5% швидше в worst-case scenarios
- **Рекомендація:** gRPC для критичних систем з важливою обробкою помилок

### 5. High-Load Performance (Production Simulation)
- **gRPC кардинально переважає** під високим навантаженням (273% швидше RPS)
- **HTTP деградує** при збільшенні concurrent connections (latency зростає в 100+ разів)
- **gRPC масштабується відмінно:** з 23 до 984 RPS без критичної деградації
- **Системні вимоги:** gRPC досягає 98.4% від цільових 1000 RPS, HTTP тільки 26.4%
- **Production-готовність:** gRPC готовий для high-load scenarios, HTTP потребує optimization

### 6. Scalability Analysis
- **HTTP bottleneck:** Обмежений connection pooling та single-threaded nature
- **gRPC efficiency:** Binary serialization та multiplexing дають кращі результати
- **Concurrent handling:** gRPC значно краще справляється з одночасними запитами
- **Resource utilization:** gRPC ефективніше використовує CPU та мережу

## Ключові висновки

### Переваги HTTP REST API:
✅ **Швидші Health Checks** - на 24% швидше для простих операцій  
✅ **Ефективні batch операції** - паралелізм дає 16% перевагу  
✅ **Знайомий протокол** - простіше в налагодженні та моніторингу  
✅ **Легка інтеграція** - стандартні HTTP клієнти та інструменти  
✅ **Менше накладних витрат** - для простих запитів  

### Переваги gRPC:
✅ **Стабільніша продуктивність** - менша варіативність (σ=7.09 vs 13.86)  
✅ **Кращий error handling** - structured errors, 55% швидше в worst-case  
✅ **Передбачуваність** - менший розкид min/max значень  
✅ **Типізовані контракти** - Protocol Buffers забезпечують type safety  
✅ **Незначно вищий throughput** - +1.9% requests/second  

### Коли використовувати HTTP REST:
🎯 **Low-to-medium load scenarios** - до 100 concurrent requests  
🎯 **Frontend інтеграції** - веб та мобільні додатки  
🎯 **Monitoring та Health Checks** - простіші та швидші в low-load  
🎯 **Публічні API** - кращі для зовнішніх інтеграцій  
🎯 **Development та debugging** - простіші інструменти  

### Коли використовувати gRPC:
🎯 **High-load production scenarios** - 500+ concurrent requests  
🎯 **Мікросервісна архітектура** - внутрішня комунікація  
🎯 **Scalable systems** - потреба в 1000+ RPS  
🎯 **Real-time applications** - низька latency критична  
🎯 **Enterprise системи** - де потрібна максимальна продуктивність  

### **КРИТИЧНО ВАЖЛИВО для Production:**
⚠️ **Під високим навантаженням HTTP може деградувати в 100+ разів**  
✅ **gRPC зберігає стабільну продуктивність навіть при 1000 concurrent requests**  
🎯 **Для досягнення системних вимог 1000 RPS необхідно використовувати gRPC**  

## Рекомендації

### Для Production використання:

#### 1. **Гібридна архітектура (Рекомендовано):**
```
Frontend Applications → HTTP REST API
Backend Services     → gRPC API
Monitoring/Health     → HTTP REST API
Batch Operations      → HTTP REST API
Real-time Updates     → gRPC Streaming
```

#### 2. **За типом навантаження:**

**Високочастотні одиночні запити:**
- Використовувати **gRPC** (стабільніша продуктивність)
- Налаштувати connection pooling
- Впровадити circuit breakers

**Batch обробка:**
- Використовувати **HTTP REST** з паралельними запитами
- Впровадити request rate limiting
- Розглянути HTTP/2 multiplexing

**Моніторинг та Health Checks:**
- Використовувати **HTTP REST** (швидші та простіші)
- Стандартні HTTP status codes
- Легша інтеграція з monitoring tools

#### 3. **За важливістю error handling:**

**Критичні бізнес-операції:**
- **gRPC** для structured error responses
- Детальні error codes через protobuf
- Consistent error handling

**Некритичні операції:**
- **HTTP REST** для простоти
- Стандартні HTTP status codes
- JSON error responses

### Технічні оптимізації:

#### Для HTTP REST API:
```javascript
// Connection pooling
const httpAgent = new http.Agent({
  keepAlive: true,
  maxSockets: 50
});

// HTTP/2 support
app.use(compression());
app.use(helmet());
```

#### Для gRPC API:
```javascript
// Connection pooling
const channelOptions = {
  'grpc.keepalive_time_ms': 30000,
  'grpc.keepalive_timeout_ms': 5000,
  'grpc.max_connection_idle_ms': 60000
};

// Streaming для batch операцій
rpc GetWeatherStream(stream WeatherRequest) returns (stream WeatherResponse);
```

### Performance Monitoring:

#### Key Metrics для HTTP:
- Response time percentiles (P50, P95, P99)
- Error rate by status code
- Connection pool utilization
- Cache hit ratio

#### Key Metrics для gRPC:
- RPC latency distribution
- Success/failure rates per method
- Connection health
- Message size distribution

## Наступні кроки та покращення

### 1. **Load Testing Results (1000 RPS)**
Для відповідності системним вимогам проведено load testing з цільовим навантаженням 1000 RPS:

```bash
# Запуск production load test
cd weather-benchmark
npm run load-test
```

**Рекомендації на основі load testing:**
- Моніторинг system resources під навантаженням
- Налаштування connection pooling для HTTP
- Оптимізація gRPC channel options
- Впровадження circuit breakers для resilience

### 2. **Розширені Performance тести:**
- **Endurance testing** - тривала робота під навантаженням (годинами)
- **Spike testing** - реакція на різке збільшення навантаження
- **Volume testing** - великі payload-и та batch операції
- **Concurrent user simulation** - реальні user patterns

### 3. **Реальні умови тестування:**
- **Network latency simulation** - тестування з мережевими затримками
- **Multi-region testing** - тестування між регіонами
- **Container environments** - Docker/Kubernetes performance
- **Cloud provider testing** - AWS/Azure/GCP специфіка

### 4. **Advanced Features тестування:**
- **gRPC Streaming** - порівняння з HTTP chunked transfer
- **Compression** - gzip для HTTP vs protobuf compression
- **Authentication overhead** - JWT vs mTLS
- **Caching strategies** - Redis integration impact

### 5. **Business Metrics:**
- **Cost analysis** - server resources utilization
- **Developer experience** - development and debugging time
- **Integration complexity** - третьої сторони integrations
- **Operational overhead** - monitoring, logging, troubleshooting

### 6. **Рекомендовані інструменти:**
```bash
# Load testing з цільовим RPS
npm run load-test                    # Вбудований load test 1000 RPS

# Альтернативні інструменти
artillery quick --count 100 --num 10 http://localhost:3000/api/v1/health

# gRPC load testing
ghz --insecure --proto ./proto/weather.proto \
    --call weather.WeatherService.GetWeather \
    -d '{"city":"Prague"}' \
    -c 50 -n 1000 localhost:50051

# Monitoring
prometheus + grafana для real-time metrics
jaeger для distributed tracing
```

### 7. **Architecture Evolution:**
- **API Gateway patterns** - single entry point з routing
- **Service mesh** - Istio/Linkerd для advanced traffic management
- **Circuit breakers** - resilience patterns
- **Adaptive load balancing** - based on performance metrics

## Додаткові ресурси

### Benchmark Infrastructure
```
weather-benchmark/
├── package.json                      # Dependencies і scripts
├── simple-test.js                    # Швидкий benchmark (5-20 iterations)
├── comprehensive-test.js             # Детальний benchmark (75+ iterations)
├── performance-test.js               # Оригінальний stress test
├── proto/weather.proto               # gRPC protocol definition
├── benchmark-results.json            # Результати простого тесту
├── comprehensive-benchmark-results.json  # Детальні результати
└── README.md                         # Інструкції з запуску
```

### Weather Service Components
- [Weather Service Main App](.../weather-service/src/app.ts) - HTTP + gRPC servers
- [gRPC Server Implementation](../weather-service/src/grpc/WeatherGrpcServer.ts)
- [HTTP REST Controller](.../weather-service/src/controllers/WeatherController.ts)
- [Protocol Buffer Definition](.../weather-service/proto/weather.proto)

### Test Results Files
- [Simple Test Results](.../weather-benchmark/benchmark-results.json)
- [Comprehensive Test Results](.../weather-benchmark/comprehensive-benchmark-results.json)
- [Benchmark Documentation](.../weather-benchmark/README.md)

### Related Architecture Documents
- [Technology Stack ADR](../adr/0002-technology-stack.md)
- [gRPC WebSocket ADR](../adr/0005-websocket-live-updates.md)
- [Weather API Microservices](../TechDD/weather-api-microservices-decomposition-proposal.md)
- [High-Level Architecture](../sdd/Weather%20Subscription%20API.md)

### Quick Start Commands
```bash
# Запуск Weather Service
cd weather-service && npm run dev

# Швидкий benchmark test (2-3 хвилини)
cd weather-benchmark && node simple-test.js

# Комплексний benchmark test (5-10 хвилин)
cd weather-benchmark && node comprehensive-test.js

# LOAD TEST - 1000 RPS відповідно до системних вимог (1-2 хвилини)
cd weather-benchmark && npm run load-test

# Оригінальний stress test
cd weather-benchmark && npm run benchmark
```

### Available Test Types
| Test Type | Command | Duration | Purpose | RPS Target |
|-----------|---------|----------|---------|------------|
| **Quick** | `npm run quick` | 2-3 хв | Швидка перевірка | ~50 |
| **Comprehensive** | `npm run comprehensive` | 5-10 хв | Статистичний аналіз | ~100 |
| **Load Test** | `npm run load-test` | 1-2 хв | Production simulation | **1000** |
| **Stress Test** | `npm run benchmark` | Варіюється | Extended testing | Варіюється |

---

*Цей аналіз проведено як частина міграції Weather Service до мікросервісної архітектури з підтримкою HTTP та gRPC протоколів.*
