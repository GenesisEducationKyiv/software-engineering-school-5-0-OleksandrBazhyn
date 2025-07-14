# Subscription Service

Мікросервіс для управління підписками користувачів на email-розсилку погоди.

## Функціональність

- Створення підписок на email-розсилку погоди
- Підтвердження підписок через email
- Відписка від розсилки
- Автоматичне відправлення розсилки за розкладом (щогодини/щодня)
- Health check endpoint

## API Endpoints

### POST /api/v1/subscribe

Створює нову підписку на email-розсилку.

**Request:**

```json
{
  "email": "user@example.com",
  "city": "Prague",
  "frequency": "daily"
}
```

**Response:**

```json
{
  "message": "Subscription successful. Confirmation email sent."
}
```

### GET /api/v1/confirm/:token

Підтверджує підписку за допомогою токена з email.

**Response:**

```
Subscription confirmed successfully
```

### GET /api/v1/unsubscribe/:token

Відписує користувача від розсилки.

**Response:**

```
Unsubscribed successfully
```

### GET /api/v1/health

Перевіряє статус сервісу.

**Response:**

```json
{
  "status": "ok",
  "service": "subscription-service",
  "timestamp": "2025-07-14T18:00:00.000Z"
}
```

## Архітектура

Мікросервіс використовує:

- **База даних**: PostgreSQL для зберігання підписок
- **Комунікація з Weather Service**: gRPC (згідно з архітектурними рекомендаціями)
- **Комунікація з Email Service**: HTTP REST API
- **Планувальник**: node-cron для автоматичних розсилок

### Основні компоненти:

1. **SubscriptionService** - основна бізнес-логіка управління підписками
2. **SubscriptionDataProvider** - робота з базою даних PostgreSQL
3. **SchedulerService** - автоматичне відправлення розсилки за розкладом
4. **WeatherServiceGrpcClient** - взаємодія з Weather Service через gRPC
5. **EmailServiceHttpClient** - взаємодія з Email Service через HTTP

### Зовнішні залежності:

- **Weather Service (gRPC)** - перевірка існування міста та отримання погодних даних
- **Email Service (HTTP)** - відправка email-повідомлень
- **PostgreSQL** - зберігання підписок

## Тестування

Мікросервіс покритий повним набором тестів:

### Unit тести:

- **SubscriptionService.test.ts** - тестування бізнес-логіки підписок
- **SubscriptionDataProvider.test.ts** - тестування роботи з базою даних
- **SchedulerService.test.ts** - тестування планувальника розсилки
- **WeatherServiceGrpcClient.test.ts** - тестування gRPC клієнта

### Integration тести:

- **api.int.test.ts** - тестування всіх API endpoints з реальною взаємодією

### Запуск тестів:

```bash
# Всі тести
npm test

# Тільки unit тести
npm run test:unit

# Тільки integration тести
npm run test:integration

# Тести з покриттям
npm test -- --coverage
```

### Тестова архітектура:

- **Мокування зовнішніх залежностей** - Weather Service, Email Service
- **Ізоляція тестів** - кожен тест незалежний
- **Тестування помилок** - всі сценарії помилок покриті
- **Інтеграційні тести** - тестування повного flow API

## Розклад розсилки

- **Щогодини** - в початок кожної години (0 \* \* \* \*)
- **Щодня** - щодня о 8:00 ранку (0 8 \* \* \*)

## Встановлення та запуск

### Локальна розробка

1. Встановіть залежності:

```bash
npm install
```

2. Налаштуйте змінні середовища в `.env` файлі:

```env
PGHOST=localhost
PGPORT=5432
PGDATABASE=weather_db
PGUSER=postgres
PGPASSWORD=postgres
PORT=3001
NODE_ENV=development
WEATHER_SERVICE_URL=http://localhost:3002
EMAIL_SERVICE_URL=http://localhost:3003
```

3. Запустіть міграції бази даних:

```bash
npm run db:migrate
```

4. Запустіть сервіс:

```bash
npm run dev
```

### Продакшн

1. Зібрати проект:

```bash
npm run build
```

2. Запустити:

```bash
npm start
```

### Docker

```bash
docker build -t subscription-service .
docker run -p 3001:3001 subscription-service
```

## Тестування

```bash
# Всі тести
npm test

# Тільки unit тести
npm run test:unit

# Тільки integration тести
npm run test:integration
```

### Структура тестів:

#### Unit тести:

- **SubscriptionService.test.ts** - тестування бізнес-логіки підписок
- **SubscriptionDataProvider.test.ts** - тестування роботи з базою даних
- **SchedulerService.test.ts** - тестування планувальника розсилки
- **WeatherServiceGrpcClient.test.ts** - тестування gRPC клієнта

#### Integration тести:

- **api.int.test.ts** - тестування всіх API endpoints з реальною взаємодією

#### Тестова архітектура:

- **Мокування зовнішніх залежностей** - Weather Service, Email Service
- **Ізоляція тестів** - кожен тест незалежний
- **Тестування помилок** - всі сценарії помилок покриті
- **Інтеграційні тести** - тестування повного flow API

## Лінтинг та форматування

```bash
# Перевірка коду
npm run lint

# Виправлення помилок
npm run lint:fix

# Форматування коду
npm run format
```

## Структура проекту

```
subscription-service/
├── src/
│   ├── controllers/          # HTTP контролери
│   ├── services/             # Бізнес-логіка
│   │   ├── subscription/     # Логіка підписок
│   │   └── scheduler/        # Планувальник розсилки
│   ├── clients/              # gRPC/HTTP клієнти для зовнішніх сервісів
│   ├── routes/               # Маршрути API
│   ├── errors/               # Кастомні помилки
│   ├── logger/               # Логування
│   ├── types.ts              # TypeScript типи
│   ├── config.ts             # Конфігурація
│   └── app.ts                # Точка входу
├── db/
│   ├── migrations/           # Міграції бази даних
│   ├── knex.ts               # Knex конфігурація
│   └── knexConfig.ts         # Knex налаштування
├── tests/                    # Тести
│   ├── unit/                 # Unit тести
│   │   ├── services/         # Тести сервісів
│   │   └── clients/          # Тести клієнтів
│   └── integration/          # Integration тести
├── logs/                     # Логи
├── package.json
├── tsconfig.json
├── jest.config.js
├── eslint.config.js
└── Dockerfile
```

## Залежності

### Основні:

- **express** - Web framework
- **knex** - SQL query builder
- **pg** - PostgreSQL клієнт
- **winston** - Логування
- **node-cron** - Планувальник завдань
- **@grpc/grpc-js** - gRPC клієнт
- **@grpc/proto-loader** - Завантаження proto файлів
- **dotenv** - Завантаження змінних середовища

### Розробка:

- **typescript** - TypeScript підтримка
- **jest** - Тестування
- **supertest** - HTTP тести
- **eslint** - Лінтинг
- **prettier** - Форматування коду
- **ts-jest** - Jest для TypeScript
- **@types/jest** - Типи для Jest

### Архітектурні особливості:

- **ESM модулі** - Використання ES modules
- **Strict TypeScript** - Суворе типування
- **Dependency Injection** - Ін'єкція залежностей
- **gRPC комунікація** - Для Weather Service
- **HTTP REST** - Для Email Service та API
- **Database migrations** - Версіонування схеми БД
- **Structured logging** - Структуроване логування
