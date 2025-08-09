# Subscription Service

Сервіс управління підписками на погодні оновлення з розширеним логуванням та моніторингом.

## Особливості логування та моніторингу

### Рівні логування

Сервіс використовує чотири рівні логування:

- **ERROR** - критичні помилки, які вимагають негайного втручання
- **WARN** - потенційні проблеми, які потребують уваги
- **INFO** - загальна інформація про роботу сервісу
- **DEBUG** - детальна інформація для налагодження (тільки в development)

### Семплінг логів

Для оптимізації продуктивності та зменшення обсягу логів реалізовано семплінг:

#### Development середовище:
- **Sample Rate**: 100% (всі логи записуються)
- **Високонавантажені патерни**: health check, heartbeat, ping, metrics scraped
- **Критичні патерни**: database connection, authentication failed, payment, security

#### Production середовище:
- **Sample Rate**: 10% для info/debug логів, 100% для warn/error
- **Високонавантажені патерни**: health check, heartbeat, ping, metrics scraped, scheduled job (семплюються до 1%)
- **Критичні патерни**: database connection, authentication failed, payment, security, crash, out of memory (ніколи не семплюються)

### Метрики

Сервіс збирає наступні групи метрик:

#### HTTP метрики:
- `http_requests_total` - загальна кількість HTTP запитів
- `http_request_duration_seconds` - тривалість HTTP запитів

#### Бізнес-логіка метрики:
- `subscriptions_total` - кількість спроб підписки
- `subscription_confirmations_total` - кількість підтверджень підписок
- `emails_sent_total` - кількість відправлених email'ів
- `weather_requests_total` - кількість запитів до weather API
- `weather_request_duration_seconds` - тривалість запитів до weather API

#### База даних метрики:
- `db_connections_active` - кількість активних з'єднань з базою
- `db_queries_total` - загальна кількість запитів до бази
- `db_query_duration_seconds` - тривалість запитів до бази

#### Redis метрики:
- `redis_operations_total` - кількість операцій Redis
- `redis_operation_duration_seconds` - тривалість операцій Redis

#### Планувальник метрики:
- `scheduled_jobs_total` - кількість виконаних запланованих завдань
- `scheduled_job_duration_seconds` - тривалість запланованих завдань

#### Логування метрики:
- `logs_total` - загальна кількість логів
- `logs_sampled_total` - кількість семплованих (відфільтрованих) логів

## Алерти для моніторингу

### Критичні алерти (P1 - негайне втручання)

#### 1. High Error Rate
```yaml
alert: HighErrorRate
expr: rate(http_requests_total{status_code=~"5.."}[5m]) > 0.1
for: 2m
severity: critical
```
**Аргументація**: Високий рівень 5xx помилок вказує на серйозні проблеми в сервісі, які впливають на користувачів.

#### 2. Service Down
```yaml
alert: ServiceDown
expr: up{job="subscription-service"} == 0
for: 1m
severity: critical
```
**Аргументація**: Повна недоступність сервісу критично впливає на бізнес.

#### 3. Database Connection Issues
```yaml
alert: DatabaseConnectionIssues
expr: rate(logs_total{level="error", service=~".*DataProvider.*"}[5m]) > 0.01
for: 3m
severity: critical
```
**Аргументація**: Проблеми з базою даних можуть привести до втрати даних та недоступності функціоналу.

#### 4. Memory Usage High
```yaml
alert: HighMemoryUsage
expr: process_resident_memory_bytes / 1024 / 1024 > 500
for: 5m
severity: critical
```
**Аргументація**: Високе використання пам'яті може призвести до OOM та падіння сервісу.

### Важливі алерти (P2 - втручання в робочий час)

#### 5. High Response Time
```yaml
alert: HighResponseTime
expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 2
for: 5m
severity: warning
```
**Аргументація**: Повільні відповіді погіршують користувацький досвід.

#### 6. Email Service Issues
```yaml
alert: EmailServiceIssues
expr: rate(emails_sent_total{status="failed"}[10m]) > 0.05
for: 5m
severity: warning
```
**Аргументація**: Проблеми з email можуть привести до втрати підтверджень підписок.

#### 7. Weather API Issues
```yaml
alert: WeatherAPIIssues
expr: rate(weather_requests_total{status="failed"}[10m]) > 0.1
for: 5m
severity: warning
```
**Аргументація**: Недоступність weather API блокує основний функціонал сервісу.

#### 8. Scheduled Jobs Failures
```yaml
alert: ScheduledJobsFailures
expr: rate(scheduled_jobs_total{status="failed"}[1h]) > 0.1
for: 10m
severity: warning
```
**Аргументація**: Збої в scheduled jobs можуть припинити автоматичну розсилку.

### Інформаційні алерти (P3 - розслідування в зручний час)

#### 9. High Log Sampling Rate
```yaml
alert: HighLogSamplingRate
expr: rate(logs_sampled_total[15m]) / rate(logs_total[15m]) > 0.8
for: 10m
severity: info
```
**Аргументація**: Високий рівень семплінгу може означати втрату важливої діагностичної інформації.

#### 10. Unusual Subscription Patterns
```yaml
alert: UnusualSubscriptionPatterns
expr: rate(subscriptions_total[1h]) > 100 or rate(subscriptions_total[1h]) < 1
for: 30m
severity: info
```
**Аргументація**: Незвичайні патерни підписок можуть вказувати на проблеми або атаки.

## Політика зберігання логів (Log Retention Policy)

### Структурована політика зберігання

#### ERROR логи
- **Зберігання**: 90 днів в активному сховищі
- **Архівування**: 365 днів в холодному сховищі
- **Видалення**: після 1 року
- **Аргументація**: Критичні помилки потребують тривалого зберігання для аналізу патернів та судових розслідувань

#### WARN логи
- **Зберігання**: 60 днів в активному сховищі
- **Архівування**: 180 днів в холодному сховищі
- **Видалення**: після 6 місяців
- **Аргументація**: Попередження важливі для превентивного обслуговування, але менш критичні ніж помилки

#### INFO логи
- **Зберігання**: 30 днів в активному сховищі
- **Архівування**: 90 днів в холодному сховищі
- **Видалення**: після 3 місяців
- **Аргументація**: Інформаційні логи корисні для аналізу трендів та аудиту, але не потребують тривалого зберігання

#### DEBUG логи
- **Зберігання**: 7 днів в активному сховищі
- **Архівування**: не архівуються
- **Видалення**: після 7 днів
- **Аргументація**: Debug логи потрібні тільки для поточного налагодження та швидко втрачають актуальність

### Стратегія ротації

#### Development середовище:
- **Ротація файлів**: щоденно або при досягненні 100MB
- **Максимум файлів**: 7 для всіх рівнів
- **Компресія**: через 1 день

#### Production середовище:
- **Ротація файлів**: щоденно або при досягненні 500MB
- **Максимум файлів**: залежить від рівня (див. вище)
- **Компресія**: через 1 день
- **Перенесення в холодне сховище**: автоматично через час активного зберігання

### Особливі випадки

#### Логи безпеки
- **Зберігання**: 2 роки в активному сховищі
- **Архівування**: 7 років в холодному сховищі
- **Аргументація**: Вимоги комплаєнсу та потенційні судові розслідування

#### Аудит логи
- **Зберігання**: 1 рік в активному сховищі
- **Архівування**: 3 роки в холодному сховищі
- **Аргументація**: Регуляторні вимоги та внутрішній аудит

#### Метрики логи
- **Зберігання**: 30 днів в активному сховищі
- **Архівування**: 90 днів в холодному сховищі
- **Аргументація**: Потрібні для аналізу продуктивності та планування ресурсів

### Автоматизація політики

Політика реалізована через:
- **Logrotate** конфігурації для файлової системи
- **Winston транспорти** з налаштуваннями maxFiles та maxsize
- **Cron jobs** для перенесення в архів та видалення
- **Cloud storage lifecycle policies** для хмарних рішень

### Моніторинг дотримання політики

Налаштовані алерти для:
- Перевищення дискового простору логами
- Збої в процесі архівування
- Невдалі спроби видалення старих логів
- Порушення графіка ротації

## Налаштування

### Змінні середовища

```env
# Logging
LOG_LEVEL=info
LOG_SAMPLE_RATE=0.1

# Metrics
METRICS_ENABLED=true
METRICS_PATH=/metrics

# Redis for message broker
REDIS_URL=redis://localhost:6379
```

### Запуск метрик

Метрики доступні за адресою: `http://localhost:3000/api/subscriptions/metrics`

## Розробка

### Додавання нових метрик

1. Додайте метрику в `src/metrics/index.ts`
2. Зареєструйте в registry
3. Використовуйте в відповідному сервісі
4. Додайте відповідні алерти в моніторинг

### Налаштування логування

Конфігурація логування знаходиться в:
- `src/logger/dev-logger.ts` - для development
- `src/logger/prod-logger.ts` - для production
- `src/logger/sampling-format.ts` - логіка семплінгу
