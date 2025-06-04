import request from 'supertest';
import express from 'express';
import apiRoutes from '../api/routes/api.js';

let app;

// Mock WeatherManager to avoid real API calls
beforeAll(async () => {
  const { default: WeatherManager } = await import('../api/managers/WeatherManager.js');
  WeatherManager.prototype.fetchWeatherData = async (city) => ({
    current: {
      temp_c: 15,
      humidity: 50,
      condition: { text: 'Sunny' }
    }
  });

  app = express();
  app.use(express.json());
  app.use('/api', apiRoutes);
});

describe('Weather API', () => {
  it('GET /api/weather returns weather data', async () => {
    const res = await request(app).get('/api/weather?city=Kyiv');
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('temperature');
    expect(res.body).toHaveProperty('humidity');
    expect(res.body).toHaveProperty('description');
  });

  it('GET /api/weather without city returns 400', async () => {
    const res = await request(app).get('/api/weather');
    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty('error');
  });
});

describe('Subscription API', () => {
  let testToken = null;
  const testEmail = `test${Math.floor(Math.random() * 100000)}@mail.com`;
  const testCity = 'Kyiv';
  const testFrequency = 'daily';

  it('POST /api/subscribe with valid data returns 200', async () => {
    const res = await request(app)
      .post('/api/subscribe')
      .send({ email: testEmail, city: testCity, frequency: testFrequency });

    expect([200, 409]).toContain(res.statusCode);
    // 200: subscription created, 409: already exists (may happen on repeated runs)
    if (res.body.message) expect(res.body.message).toMatch(/confirmation email sent/i);
    if (res.body.error) expect(res.body.error).toMatch(/already subscribed/i);
  });

  it('POST /api/subscribe with invalid data returns 400', async () => {
    const res = await request(app)
      .post('/api/subscribe')
      .send({ email: '', city: '', frequency: 'weekly' });
    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('GET /api/confirm/:token with invalid token returns 400 or 404', async () => {
    const res = await request(app).get('/api/confirm/invalidtoken');
    expect([400, 404]).toContain(res.statusCode);
  });

  it('GET /api/unsubscribe/:token with invalid token returns 400 or 404', async () => {
    const res = await request(app).get('/api/unsubscribe/invalidtoken');
    expect([400, 404]).toContain(res.statusCode);
  });

  // Optionally: create a subscription and test confirm/unsubscribe for a real token
  // For that, you need to read token from db or mock Mailer to save token
});
