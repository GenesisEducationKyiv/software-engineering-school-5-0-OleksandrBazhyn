# Weather Service Performance Benchmark

Комплексна система для порівняння продуктивності HTTP REST API та gRPC API Weather Service.

## 📋 Що тестується

### Операції:
1. **Health Check** - перевірка стану сервісу (20 ітерацій)
2. **Single Requests** - отримання погоди для одного міста (75 ітерацій)  
3. **Batch Requests** - отримання погоди для множинних міст (10 ітерацій)
4. **Error Handling** - обробка помилок для неіснуючих міст (10 ітерацій)

### Метрики:
- **Latency** (затримка) - час відгуку в мілісекундах
- **Throughput** - кількість запитів за одиницю часу
- **Success Rate** - відсоток успішних запитів
- **Statistical Distribution** - P50, P95, P99 percentiles
- **Consistency** - стандартне відхилення та коефіцієнт варіації

## 🚀 Запуск

### Попередні вимоги:
1. Weather Service повинен працювати на портах:
   - HTTP: `localhost:3000`
   - gRPC: `localhost:50051`

```bash
# Запуск Weather Service
cd ../weather-service
npm run dev
```

### Встановлення та запуск:
```bash
cd weather-benchmark
npm install

# Швидкий тест (2-3 хвилини)
npm run quick

# Комплексний тест (5-10 хвилин)
npm run comprehensive

# Оригінальний stress test
npm run benchmark

# Всі тести підряд
npm run test:all
```

## 📊 Типи тестів

### 1. Quick Test (`simple-test.js`)
- **Мета:** Швидка перевірка базової продуктивності
- **Час виконання:** 2-3 хвилини
- **Ітерації:** 5 health checks, 3 single requests, 1 batch
- **Вихід:** `benchmark-results.json`

### 2. Comprehensive Test (`comprehensive-test.js`)
- **Мета:** Детальний статистичний аналіз
- **Час виконання:** 5-10 хвилин
- **Ітерації:** 20 health checks, 75 single requests, 10 batch, 10 error handling
- **Вихід:** `comprehensive-benchmark-results.json`

### 3. Stress Test (`performance-test.js`)
- **Мета:** Навантажувальне тестування
- **Час виконання:** Варіюється
- **Особливості:** Більше ітерацій та контроль над параметрами

## 📈 Результати

### Приклад виводу:
```
� COMPREHENSIVE BENCHMARK RESULTS
============================================================

HTTP DETAILED RESULTS:
  healthChecks:
    Average: 1.93ms
    Median: 1.24ms
    95th Percentile: 15.66ms
    Success Rate: 100.0%

gRPC DETAILED RESULTS:
  healthChecks:
    Average: 2.40ms
    Median: 1.27ms
    95th Percentile: 20.95ms
    Success Rate: 100.0%

🏆 COMPARISON:
  healthChecks: HTTP is 24.1% faster
  singleRequests: gRPC is 1.8% faster
  batchRequests: HTTP is 16.3% faster
  errorHandling: gRPC is 11.4% faster
```

### Структура результатів:
```json
{
  "timestamp": "2025-07-13T17:51:50.692Z",
  "testConfiguration": {
    "healthCheckIterations": 20,
    "singleRequestIterations": 75,
    "batchRequestIterations": 10
  },
  "summary": {
    "http": { /* статистики */ },
    "grpc": { /* статистики */ }
  },
  "detailed": { /* сирі дані */ }
}
```

## 🔧 Команди

| Команда | Опис | Час виконання |
|---------|------|---------------|
| `npm run quick` | Швидкий benchmark | 2-3 хв |
| `npm run comprehensive` | Повний статистичний аналіз | 5-10 хв |
| `npm run benchmark` | Оригінальний stress test | Варіюється |
| `npm run test:all` | Всі тести підряд | 10-15 хв |
| `npm run clean` | Очистити файли результатів | 1 сек |
| `npm run start` | Показати доступні команди | 1 сек |

## 📝 Аналіз результатів

Детальний аналіз продуктивності доступний в:
- [Performance Analysis](../docs/PERFORMANCE_ANALYSIS.md) - Комплексний звіт з висновками
- [Architecture Decisions](../docs/adr/) - Рішення щодо технологій
- [Technical Design](../docs/TechDD/) - Архітектурна документація

## 🛠️ Розробка

### Додавання нових тестів:
1. Створіть новий `.js` файл
2. Импортуйте необхідні клієнти
3. Додайте функцію `measureTime()`
4. Реалізуйте тестові сценарії
5. Додайте команду в `package.json`

### Приклад нового тесту:
```javascript
const myCustomTest = measureTime(async () => {
  // Ваш тестовий код
  return await someApiCall();
});

// Запуск тесту
const result = await myCustomTest();
console.log(`Test completed in ${result.duration}ms`);
```
    Average: X.XXms
    Min: X.XXms  
    Max: X.XXms
    Success Rate: XX.X%
    Total Tests: XX

🏆 COMPARISON (HTTP vs gRPC):
------------------------------
healthChecks: gRPC is X.X% faster
singleRequests: gRPC is X.X% faster
batchRequests: gRPC is X.X% faster
errorHandling: HTTP is X.X% faster
```

## 🔧 Конфігурація

Можна змінити параметри тестування у файлі `performance-test.js`:

```javascript
// Кількість ітерацій для кожного тесту
await this.runHealthCheckTest(20);     // Health checks
await this.runSingleRequestTest(10);   // Single requests  
await this.runBatchRequestTest(5);     // Batch requests
await this.runErrorHandlingTest(5);    // Error handling
```

## 📝 Аналіз

Детальний аналіз результатів дивіться у документації:
- [Performance Analysis Report](../docs/PERFORMANCE_ANALYSIS.md)
