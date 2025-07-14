import request from "supertest";
import express from "express";
import { createSubscriptionRoutes } from "../../src/routes/api.js";
import SubscriptionController from "../../src/controllers/SubscriptionController.js";
import SubscriptionService from "../../src/services/subscription/SubscriptionService.js";
import SubscriptionDataProvider from "../../src/services/subscription/SubscriptionDataProvider.js";
import { createLogger } from "../../src/logger/index.js";
import type {
  WeatherServiceClient,
  EmailServiceClient,
  DataProvider,
} from "../../src/types.js";

// Mock dependencies
const mockWeatherClient: WeatherServiceClient = {
  getWeatherData: jest.fn().mockResolvedValue({
    current: {
      temp_c: 25.5,
      humidity: 60,
      condition: { text: "Sunny" },
    },
  }),
};

const mockEmailClient: EmailServiceClient = {
  sendConfirmationEmail: jest.fn().mockResolvedValue(undefined),
  sendWeatherEmail: jest.fn().mockResolvedValue(undefined),
};

const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
} as any;

// Mock data provider
const mockDataProvider: DataProvider = {
  checkSubscriptionExists: jest.fn().mockResolvedValue(false),
  insertSubscription: jest.fn().mockResolvedValue(undefined),
  updateSubscriptionStatus: jest.fn().mockResolvedValue(true),
  deleteSubscription: jest.fn().mockResolvedValue(true),
  getSubscriptionsByFrequency: jest.fn().mockResolvedValue([]),
};

describe("Subscription API Integration Tests", () => {
  let app: express.Express;
  let subscriptionService: SubscriptionService;
  let dataProvider: SubscriptionDataProvider;

  const testEmail = "test@example.com";
  const testCity = "Prague";
  const testFrequency = "daily";
  let token: string | null = null;

  beforeAll(async () => {
    app = express();
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

    // Використовуємо mockDataProvider замість реального
    subscriptionService = new SubscriptionService(
      mockDataProvider,
      mockWeatherClient,
      mockEmailClient,
      mockLogger,
    );

    const subscriptionController = new SubscriptionController(
      subscriptionService,
      mockLogger,
    );

    // Налаштовуємо маршрути
    app.use("/api/v1", createSubscriptionRoutes(subscriptionController));

    // Error handler
    app.use(
      (
        error: Error,
        req: express.Request,
        res: express.Response,
        _next: express.NextFunction,
      ) => {
        res.status(500).json({ error: "Internal server error" });
      },
    );
  });

  beforeEach(() => {
    jest.clearAllMocks();
    token = null;

    // Скидаємо моки до дефолтних значень
    (mockDataProvider.checkSubscriptionExists as jest.Mock).mockResolvedValue(
      false,
    );
    (mockDataProvider.insertSubscription as jest.Mock).mockResolvedValue(
      undefined,
    );
    (mockDataProvider.updateSubscriptionStatus as jest.Mock).mockResolvedValue(
      true,
    );
    (mockDataProvider.deleteSubscription as jest.Mock).mockResolvedValue(true);
    (
      mockDataProvider.getSubscriptionsByFrequency as jest.Mock
    ).mockResolvedValue([]);
  });

  describe("POST /api/v1/subscribe", () => {
    it("should subscribe a new user successfully", async () => {
      const res = await request(app)
        .post("/api/v1/subscribe")
        .send({ email: testEmail, city: testCity, frequency: testFrequency });

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toMatch(/confirmation email sent/i);
      expect(mockWeatherClient.getWeatherData).toHaveBeenCalledWith(testCity);
      expect(mockEmailClient.sendConfirmationEmail).toHaveBeenCalledWith(
        testEmail,
        testCity,
        expect.any(String),
      );

      // Зберігаємо токен для подальших тестів
      const emailCalls = (mockEmailClient.sendConfirmationEmail as jest.Mock)
        .mock.calls;
      if (emailCalls.length > 0) {
        token = emailCalls[0][2];
      }
    });

    it("should not allow duplicate subscriptions", async () => {
      // Встановлюємо мок для дублікату
      (mockDataProvider.checkSubscriptionExists as jest.Mock).mockResolvedValue(
        true,
      );

      const res = await request(app)
        .post("/api/v1/subscribe")
        .send({ email: testEmail, city: testCity, frequency: testFrequency });

      expect(res.statusCode).toBe(409);
      expect(res.body.error).toMatch(/already subscribed/i);
    });

    it("should return 400 for invalid email format", async () => {
      const res = await request(app).post("/api/v1/subscribe").send({
        email: "invalid-email",
        city: testCity,
        frequency: testFrequency,
      });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toMatch(/invalid email format/i);
    });

    it("should return 400 for invalid frequency", async () => {
      const res = await request(app)
        .post("/api/v1/subscribe")
        .send({ email: testEmail, city: testCity, frequency: "invalid" });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toMatch(/invalid input/i);
    });

    it("should return 400 for missing fields", async () => {
      const res = await request(app)
        .post("/api/v1/subscribe")
        .send({ email: testEmail, city: testCity });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toMatch(/invalid input/i);
    });

    it("should return 404 when city not found", async () => {
      (mockWeatherClient.getWeatherData as jest.Mock).mockResolvedValueOnce(
        null,
      );

      const res = await request(app).post("/api/v1/subscribe").send({
        email: testEmail,
        city: "NonExistentCity",
        frequency: testFrequency,
      });

      expect(res.statusCode).toBe(500);
      expect(res.body.error).toMatch(/weather service error/i);
    });
  });

  describe("GET /api/v1/confirm/:token", () => {
    beforeEach(async () => {
      // Створюємо підписку для тестування
      await request(app)
        .post("/api/v1/subscribe")
        .send({ email: testEmail, city: testCity, frequency: testFrequency });

      const emailCalls = (mockEmailClient.sendConfirmationEmail as jest.Mock)
        .mock.calls;
      if (emailCalls.length > 0) {
        token = emailCalls[0][2];
      }
    });

    it("should confirm subscription with valid token", async () => {
      const res = await request(app).get(`/api/v1/confirm/${token}`);

      expect(res.statusCode).toBe(200);
      expect(res.text).toMatch(/confirmed successfully/i);
    });

    it("should return 400 for invalid token", async () => {
      // Встановлюємо мок для невалідного токена
      (
        mockDataProvider.updateSubscriptionStatus as jest.Mock
      ).mockResolvedValue(false);

      const res = await request(app).get("/api/v1/confirm/invalid-token");

      expect(res.statusCode).toBe(400);
      expect(res.text).toMatch(/invalid token/i);
    });

    it("should return 400 for missing token", async () => {
      const res = await request(app).get("/api/v1/confirm/");

      expect(res.statusCode).toBe(404);
    });
  });

  describe("GET /api/v1/unsubscribe/:token", () => {
    beforeEach(async () => {
      // Створюємо та підтверджуємо підписку
      await request(app)
        .post("/api/v1/subscribe")
        .send({ email: testEmail, city: testCity, frequency: testFrequency });

      const emailCalls = (mockEmailClient.sendConfirmationEmail as jest.Mock)
        .mock.calls;
      if (emailCalls.length > 0) {
        token = emailCalls[0][2];
      }

      // Підтверджуємо підписку
      await request(app).get(`/api/v1/confirm/${token}`);
    });

    it("should unsubscribe with valid token", async () => {
      const res = await request(app).get(`/api/v1/unsubscribe/${token}`);

      expect(res.statusCode).toBe(200);
      expect(res.text).toMatch(/unsubscribed successfully/i);
    });

    it("should return 400 when trying to unsubscribe again with same token", async () => {
      // Спочатку відписуємося (успішно)
      await request(app).get(`/api/v1/unsubscribe/${token}`);

      // Для повторного виклику мок повинен повернути false
      (mockDataProvider.deleteSubscription as jest.Mock).mockResolvedValue(
        false,
      );

      // Спробуємо відписатися знову
      const res = await request(app).get(`/api/v1/unsubscribe/${token}`);

      expect(res.statusCode).toBe(400);
    });

    it("should return 400 for invalid token", async () => {
      // Встановлюємо мок для невалідного токена
      (mockDataProvider.deleteSubscription as jest.Mock).mockResolvedValue(
        false,
      );

      const res = await request(app).get("/api/v1/unsubscribe/invalid-token");

      expect(res.statusCode).toBe(400);
      expect(res.text).toMatch(/invalid token/i);
    });
  });

  describe("GET /api/v1/health", () => {
    it("should return health status", async () => {
      const res = await request(app).get("/api/v1/health");

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty("status", "ok");
      expect(res.body).toHaveProperty("service", "subscription-service");
      expect(res.body).toHaveProperty("timestamp");
    });
  });
});
