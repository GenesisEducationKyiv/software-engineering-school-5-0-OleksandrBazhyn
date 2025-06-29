import request from "supertest";
import express, { Express } from "express";
import { jest, beforeAll, afterAll, describe, it, expect } from "@jest/globals";

import { CityNotFound } from "../../src/errors/SubscriptionError.js";

jest.mock("../../src/entities/MailManager.js");

import apiRoutes from "../../src/routes/api.js";
import MailManager from "../../src/entities/MailManager.js";
import nodemailer from "nodemailer";
import { WeatherData } from "../../src/types.js";

let app: Express;

beforeAll(() => {
  app = express();
  app.use(express.json());
  app.use("/api", apiRoutes);
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

    const mockTransporter = {} as nodemailer.Transporter;

    const mailerInstance = new MailManager(mockTransporter);
    token = (mailerInstance as any).__getLastToken() ?? null;
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
    expect(typeof res.body.temperature).toBe("number");
    expect(typeof res.body.humidity).toBe("number");
    expect(typeof res.body.description).toBe("string");
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
