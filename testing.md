# Testing Guide

> **Вимоги:**  
> На машині встановлені **git**, **docker** та платформа **Node.js**.

---

## Як запустити всі тести однією командою

```sh
docker compose -f docker-compose.yml up --build --abort-on-container-exit
```

- Це підніме всі необхідні сервіси (PostgreSQL, бекенд, фронтенд) і запустить тести у контейнері `test`.
- Після завершення тестів контейнери зупиняться автоматично.

---

## Як запустити окремі види тестів

### Unit-тести

```sh
docker compose -f docker-compose.yml run --rm test npm run test:unit
```

### Integration-тести

```sh
docker compose -f docker-compose.yml run --rm test npm run test:integration
```

### E2E-тести (Playwright)

```sh
docker compose -f docker-compose.yml run --rm client npm run test:e2e
```

---

## Примітки

- **Всі залежності для інтеграційних тестів (PostgreSQL) піднімаються автоматично через Docker.**
- Для запуску тестів не потрібно нічого встановлювати локально, окрім git та docker.
- Результати тестів можна переглянути у логах відповідних контейнерів.