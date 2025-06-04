import request from 'supertest';
import express from 'express';
import apiRoutes from '../api/routes/api.js';

import Mailer from '../api/managers/Mailer.js';

// manually mock Mailer methods for ESM:
Mailer.sendConfirmationEmail = async (email, city, token) => {
  Mailer.__token = token;
  return Promise.resolve();
};
Mailer.sendWeatherEmails = async () => Promise.resolve();
Mailer.__getToken = () => Mailer.__token;


let app;
beforeAll(async () => {
  const { default: WeatherManager } = await import('../api/managers/WeatherManager.js');
  WeatherManager.prototype.fetchWeatherData = async (city) => ({
    current: {
      temp_c: 15,
      humidity: 44,
      condition: { text: 'Cloudy' }
    }
  });

  app = express();
  app.use(express.json());
  app.use('/api', apiRoutes);
});

describe('Advanced Subscription/Confirmation workflow', () => {
  const testEmail = `user${Math.floor(Math.random() * 100000)}@mail.com`;
  const testCity = "Kyiv";
  const testFrequency = "daily";
  let token = null;

  it('Subscribes a new user, receives token via mock Mailer', async () => {
    const res = await request(app)
      .post('/api/subscribe')
      .send({ email: testEmail, city: testCity, frequency: testFrequency });
    expect(res.statusCode).toBe(200);
    expect(res.body.message).toMatch(/confirmation email sent/i);

    // Get token from the mock Mailer
    token = Mailer.__getToken();
    expect(token).toBeTruthy();
  });

  it('Does not allow to subscribe again with same email/city/frequency', async () => {
    const res = await request(app)
      .post('/api/subscribe')
      .send({ email: testEmail, city: testCity, frequency: testFrequency });
    expect(res.statusCode).toBe(409);
    expect(res.body.error).toMatch(/already subscribed/i);
  });

  it('Confirm subscription with valid token', async () => {
    const res = await request(app).get(`/api/confirm/${token}`);
    expect(res.statusCode).toBe(200);
    expect(res.text).toMatch(/confirmed successfully/i);
  });

  it('Unsubscribe with valid token', async () => {
    const res = await request(app).get(`/api/unsubscribe/${token}`);
    expect(res.statusCode).toBe(200);
    expect(res.text).toMatch(/unsubscribed/i);
  });

  it('Unsubscribe again with same token returns 400/404', async () => {
    const res = await request(app).get(`/api/unsubscribe/${token}`);
    expect([400, 404]).toContain(res.statusCode);
  });

  it('Subscribe with invalid frequency returns 400', async () => {
    const res = await request(app)
      .post('/api/subscribe')
      .send({ email: "new@mail.com", city: "Dnipro", frequency: "weekly" });
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/invalid input/i);
  });

  it('Subscribe with missing fields returns 400', async () => {
    const res = await request(app)
      .post('/api/subscribe')
      .send({ email: "", city: "", frequency: "" });
    expect(res.statusCode).toBe(400);
  });

  it('Weather for unknown city returns 404', async () => {
    // Mock fetchWeatherData to simulate city not found
    const { default: WeatherManager } = await import('../api/managers/WeatherManager.js');
    WeatherManager.prototype.fetchWeatherData = async (city) => { throw new Error('Not found'); };

    const res = await request(app).get('/api/weather?city=UnknownCity');
    expect(res.statusCode).toBe(404);
    expect(res.body).toHaveProperty('error');
  });
});
