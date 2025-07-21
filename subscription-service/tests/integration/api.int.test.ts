import request from "supertest";
import express, { Express } from "express";
import { jest, beforeAll, afterAll, describe, it, expect } from "@jest/globals";

const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
} as any;

import { createApiRoutes } from "../../src/routes/api.js";
import { SubscriptionService } from "../../src/services/subscription/SubscriptionService.js";
import { SubscriptionDataProvider } from "../../src/services/subscription/SubscriptionDataProvider.js";

let app: Express;

beforeAll(() => {
  app = express();
  app.use(express.json());

  // Mock external service clients
  const mockWeatherClient = {
    getWeather: jest.fn(),
    healthCheck: jest.fn().mockResolvedValue(true),
    disconnect: jest.fn(),
  } as any;

  const mockEmailClient = {
    sendEmail: jest.fn().mockResolvedValue(true),
    healthCheck: jest.fn().mockResolvedValue(true),
  } as any;

  const subscriptionDataProvider = new SubscriptionDataProvider();
  const subscriptionService = new SubscriptionService(
    subscriptionDataProvider,
    mockWeatherClient,
    mockEmailClient
  );

  const apiRoutes = createApiRoutes(subscriptionService, mockWeatherClient, mockEmailClient);
  app.use("/api/subscriptions", apiRoutes);
});

describe("Subscription Service API Integration", () => {
  const testEmail = `user${Math.floor(Math.random() * 100000)}@mail.com`;
  const testCity = "Kyiv";
  const testFrequency = "daily";
  let token: string | null = null;

  it("Should subscribe a new user", async () => {
    const res = await request(app)
      .post("/api/subscriptions/subscribe")
      .send({ email: testEmail, city: testCity, frequency: testFrequency });
    expect(res.statusCode).toBe(200);
    expect(res.body.message).toMatch(/confirmation email sent/i);
  });

  it("Should not allow duplicate subscriptions", async () => {
    const res = await request(app)
      .post("/api/subscriptions/subscribe")
      .send({ email: testEmail, city: testCity, frequency: testFrequency });
    expect(res.statusCode).toBe(409);
    expect(res.body.error).toMatch(/already subscribed/i);
  });

  it("Should reject invalid subscription data", async () => {
    const res = await request(app)
      .post("/api/subscriptions/subscribe")
      .send({ email: "", city: "", frequency: "weekly" });
    expect(res.statusCode).toBe(400);
  });

  it("Should provide health check", async () => {
    const res = await request(app).get("/api/subscriptions/health");
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("status");
    expect(res.body).toHaveProperty("services");
  });

  it("Should handle invalid confirmation token", async () => {
    const res = await request(app).get("/api/subscriptions/confirm/invalidtoken");
    expect([400, 404]).toContain(res.statusCode);
  });

  it("Should handle invalid unsubscribe token", async () => {
    const res = await request(app).get("/api/subscriptions/unsubscribe/invalidtoken");
    expect([400, 404, 500]).toContain(res.statusCode);
  });
});

// Real data provider, mocked external services only

describe("SubscriptionService Integration", () => {
  let service: SubscriptionService;
  let dataProvider: SubscriptionDataProvider; // Real implementation

  beforeEach(() => {
    dataProvider = new SubscriptionDataProvider(); // Real DB connection
    // Mock only external services
    service = new SubscriptionService(dataProvider, mockWeatherClient, mockEmailClient);
  });
});
