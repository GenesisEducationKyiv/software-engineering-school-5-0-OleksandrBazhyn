# Metrics Service (Prometheus + Grafana)

## Опис

Цей сервіс відповідає за централізований збір, зберігання та моніторинг метрик усіх мікросервісів системи.  
Він побудований на базі [Prometheus](https://prometheus.io/) для збору метрик та [Grafana](https://grafana.com/) для візуалізації.

---

## Як це працює

1. **Кожен мікросервіс** (наприклад, weather-service, subscription-service, email-service) експортує власні метрики на endpoint `/metrics` (формат Prometheus, наприклад, через бібліотеку `prom-client` для Node.js).
2. **Prometheus** (цей metrics-service) періодично опитує ці endpoints, збирає та зберігає метрики.
3. **Grafana** підключається до Prometheus і дозволяє створювати дашборди для моніторингу стану системи.

---

## Швидкий старт

### 1. Переконайся, що всі сервіси мають endpoint `/metrics`

- Для Node.js сервісів використовуй [prom-client](https://github.com/siimon/prom-client).

### 2. Налаштуй Prometheus

Файл конфігурації: `metrics-service/prometheus.yml`

```yaml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'weather-service'
    static_configs:
      - targets: ['host.docker.internal:3000']
  - job_name: 'subscription-service'
    static_configs:
      - targets: ['host.docker.internal:3001']
  - job_name: 'email-service'
    static_configs:
      - targets: ['host.docker.internal:3002']
```

> Заміни порти, якщо твої сервіси працюють на інших портах.

### 3. Запусти Prometheus

```sh
docker run -p 9090:9090 -v "C:\абсолютний\шлях\до\metrics-service\prometheus.yml:/etc/prometheus/prometheus.yml" prom/prometheus
```

- Prometheus UI буде доступний на [http://localhost:9090](http://localhost:9090)
- У вкладці **Status → Targets** можна перевірити, чи збираються метрики з усіх сервісів.

### 4. (Опціонально) Запусти Grafana

```sh
docker run -d -p 3000:3000 grafana/grafana
```

- Grafana UI: [http://localhost:3000](http://localhost:3000)
- Логін за замовчуванням: `admin` / `admin`
- Додай Prometheus як data source (URL: `http://host.docker.internal:9090` або `http://localhost:9090`)
- Створи власний dashboard для моніторингу метрик.

---

## Корисні посилання

- [Prometheus Docs](https://prometheus.io/docs/introduction/overview/)
- [Grafana Docs](https://grafana.com/docs/)
- [prom-client (Node.js)](https://github.com/siimon/prom-client)

---

## Поширені питання

- **Q:** Що робити, якщо метрики не збираються?
  - **A:** Перевір, чи доступний endpoint `/metrics` у відповідному сервісі та чи правильно вказаний порт у `prometheus.yml`.

- **Q:** Як додати новий сервіс до моніторингу?
  - **A:** Додай новий блок у `scrape_configs` у `prometheus.yml` з відповідним портом.

---

## Автор

Oleksandr Bazhyn

```// filepath: metrics-service/README.md

# Metrics Service (Prometheus + Grafana)

## Опис

Цей сервіс відповідає за централізований збір, зберігання та моніторинг метрик усіх мікросервісів системи.  
Він побудований на базі [Prometheus](https://prometheus.io/) для збору метрик та [Grafana](https://grafana.com/) для візуалізації.

---

## Як це працює

1. **Кожен мікросервіс** (наприклад, weather-service, subscription-service, email-service) експортує власні метрики на endpoint `/metrics` (формат Prometheus, наприклад, через бібліотеку `prom-client` для Node.js).
2. **Prometheus** (цей metrics-service) періодично опитує ці endpoints, збирає та зберігає метрики.
3. **Grafana** підключається до Prometheus і дозволяє створювати дашборди для моніторингу стану системи.

---

## Швидкий старт

### 1. Переконайся, що всі сервіси мають endpoint `/metrics`

- Для Node.js сервісів використовуй [prom-client](https://github.com/siimon/prom-client).

### 2. Налаштуй Prometheus

Файл конфігурації: `metrics-service/prometheus.yml`

```yaml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'weather-service'
    static_configs:
      - targets: ['host.docker.internal:3000']
  - job_name: 'subscription-service'
    static_configs:
      - targets: ['host.docker.internal:3001']
  - job_name: 'email-service'
    static_configs:
      - targets: ['host.docker.internal:3002']
```

> Заміни порти, якщо твої сервіси працюють на інших портах.

### 3. Запусти Prometheus

```sh
docker run -p 9090:9090 -v "C:\абсолютний\шлях\до\metrics-service\prometheus.yml:/etc/prometheus/prometheus.yml" prom/prometheus
```

- Prometheus UI буде доступний на [http://localhost:9090](http://localhost:9090)
- У вкладці **Status → Targets** можна перевірити, чи збираються метрики з усіх сервісів.

### 4. (Опціонально) Запусти Grafana

```sh
docker run -d -p 3000:3000 grafana/grafana
```

- Grafana UI: [http://localhost:3000](http://localhost:3000)
- Логін за замовчуванням: `admin` / ``
- Додай Prometheus як data source (URL: `http://host.docker.internal:9090` або `http://localhost:9090`)
- Створи власний dashboard для моніторингу метрик.

---

## Корисні посилання

- [Prometheus Docs](https://prometheus.io/docs/introduction/overview/)
- [Grafana Docs](https://grafana.com/docs/)
- [prom-client (Node.js)](https://github.com/siimon/prom-client)

---