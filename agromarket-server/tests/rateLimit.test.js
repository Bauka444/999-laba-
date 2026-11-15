import { describe, it, expect } from 'vitest';
import express from 'express';
import request from 'supertest';
import app from '../app.js';
import { createAuthLimiter } from '../middleware/rateLimit.js';

describe('Rate limit', () => {
  it('вход: после 5 неверных паролей приходит 429 с понятным текстом', async () => {
    const body = { email: 'nobody@test.kz', password: 'wrong-password' };
    const codes = [];
    for (let i = 0; i < 7; i++) {
      codes.push((await request(app).post('/api/auth/login').send(body)).status);
    }
    expect(codes.slice(0, 5)).toEqual([401, 401, 401, 401, 401]);
    expect(codes.slice(5)).toEqual([429, 429]);

    const last = await request(app).post('/api/auth/login').send(body);
    expect(last.body.error).toMatch(/Слишком много/);
    expect(last.headers['ratelimit']).toBeDefined(); // стандартный заголовок RateLimit
  });

  it('фабрика createAuthLimiter: лимит 2 → третий запрос 429', async () => {
    const mini = express();
    mini.post('/x', createAuthLimiter({ limit: 2 }), (req, res) => res.json({ ok: true }));

    expect((await request(mini).post('/x')).status).toBe(200);
    expect((await request(mini).post('/x')).status).toBe(200);
    expect((await request(mini).post('/x')).status).toBe(429);
  });
});
