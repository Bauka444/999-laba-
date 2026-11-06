import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../app.js';

// Первый разрешённый адрес из CORS_ORIGIN (в vitest.config.js по умолчанию http://localhost:5173)
const allowedOrigin = process.env.CORS_ORIGIN.split(',')[0].trim();

describe('GET /api/health', () => {
  it('отвечает 200', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
  });

  it('сообщает, что база доступна, и показывает версию', async () => {
    const res = await request(app).get('/api/health');
    expect(res.body.db).toBe('ok');
    expect(res.body.version).toBe('local');   // локально и в CI нет RENDER_GIT_COMMIT
  });
});

describe('CORS', () => {
  it('разрешённый адрес получает заголовок', async () => {
    const res = await request(app)
      .get('/api/products')
      .set('Origin', allowedOrigin);
    expect(res.headers['access-control-allow-origin']).toBe(allowedOrigin);
  });

  it('чужой Origin заголовка не получает', async () => {
    const res = await request(app)
      .get('/api/products')
      .set('Origin', 'https://evil.example');
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });
});
