import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../app.js';

describe('Защита API: helmet и размер тела', () => {
  it('нет заголовка X-Powered-By (helmet скрывает, что это Express)', async () => {
    const res = await request(app).get('/api/health');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });

  it('есть X-Content-Type-Options: nosniff и Strict-Transport-Security', async () => {
    const res = await request(app).get('/api/health');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['strict-transport-security']).toBeDefined();
  });

  it('тело запроса больше лимита → 413', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'x'.repeat(200_000), email: 'a@a.kz', password: '12345678' });

    expect(res.status).toBe(413);
  });

  it('битый JSON → 400', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .set('Content-Type', 'application/json')
      .send('{"email": ');

    expect(res.status).toBe(400);
  });
});
