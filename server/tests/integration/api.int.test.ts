import request from "supertest";
import express, { Express } from "express";
import { jest, beforeAll, describe, it, expect } from "@jest/globals";

let lastToken: string | undefined = undefined;
const mockMailer = {
  sendConfirmationEmail: jest.fn(async (_email, _city, token) => {
    lastToken = token as string;
  }),
  sendWeatherEmail: jest.fn(),
};

jest.mock("../../src/managers/GmailMailer.js", () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => mockMailer),
}));

import apiRoutes from "../../src/routes/api.js";

let app: Express;
let server: any;
beforeAll(async () => {
  const { default: WeatherManager } = await import("../../src/managers/WeatherManager.js");
  WeatherManager.prototype.getWeatherData = async (_city: string) => ({
    current: {
      temp_c: 15,
      humidity: 44,
      condition: { text: "Cloudy" },
    },
  });

  app = express();
  app.use(express.json());
  app.use("/api", apiRoutes);

  server = app.listen(0);
});

afterAll(async () => {
  if (server && server.close) {
    await new Promise((resolve) => server.close(resolve));
  }
});

describe("Advanced Subscription/Confirmation workflow", () => {
  const testEmail = `user${Math.floor(Math.random() * 100000)}@mail.com`;
  const testCity = "Kyiv";
  const testFrequency = "daily";
  let token: string | null = null;

  it("Subscribes a new user, receives token via mock Mailer", async () => {
    const res = await request(app)
      .post("/api/subscribe")
      .send({ email: testEmail, city: testCity, frequency: testFrequency });
    expect(res.statusCode).toBe(200);
    expect(res.body.message).toMatch(/confirmation email sent/i);

    token = lastToken ?? null;
    expect(token).toBeTruthy();
  });

  it("Does not allow to subscribe again with same email/city/frequency", async () => {
    const res = await request(app)
      .post("/api/subscribe")
      .send({ email: testEmail, city: testCity, frequency: testFrequency });
    expect(res.statusCode).toBe(409);
    expect(res.body.error).toMatch(/already subscribed/i);
  });

  it("Confirm subscription with valid token", async () => {
    const res = await request(app).get(`/api/confirm/${token}`);
    expect(res.statusCode).toBe(200);
    expect(res.text).toMatch(/confirmed successfully/i);
  });

  it("Unsubscribe with valid token", async () => {
    const res = await request(app).get(`/api/unsubscribe/${token}`);
    expect(res.statusCode).toBe(200);
    expect(res.text).toMatch(/unsubscribed/i);
  });

  it("Unsubscribe again with same token returns 400/404/500", async () => {
    const res = await request(app).get(`/api/unsubscribe/${token}`);
    expect([400, 404, 500]).toContain(res.statusCode);
  });

  it("Subscribe with invalid frequency returns 400", async () => {
    const res = await request(app)
      .post("/api/subscribe")
      .send({ email: "new@mail.com", city: "Dnipro", frequency: "weekly" });
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/invalid input/i);
  });

  it("Subscribe with missing fields returns 400", async () => {
    const res = await request(app)
      .post("/api/subscribe")
      .send({ email: "", city: "", frequency: "" });
    expect(res.statusCode).toBe(400);
  });

  it("Weather for known city returns weather data", async () => {
    const res = await request(app).get("/api/weather?city=Kyiv");
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("temperature");
    expect(res.body).toHaveProperty("humidity");
    expect(res.body).toHaveProperty("description");
  });

  it("Weather for unknown city returns 404", async () => {
    const { default: WeatherManager } = await import("../../src/managers/WeatherManager.js");
    WeatherManager.prototype.getWeatherData = async (_city: string) => {
      throw new Error("Not found");
    };

    const res = await request(app).get("/api/weather?city=UnknownCity");
    expect(res.statusCode).toBe(404);
    expect(res.body).toHaveProperty("error");
  });

  it("GET /api/confirm/:token with invalid token returns 400 or 404", async () => {
    const res = await request(app).get("/api/confirm/invalidtoken");
    expect([400, 404]).toContain(res.statusCode);
  });

  it("GET /api/unsubscribe/:token with invalid token returns 400, 404 or 500", async () => {
    const res = await request(app).get("/api/unsubscribe/invalidtoken");
    expect([400, 404, 500]).toContain(res.statusCode);
  });
});
