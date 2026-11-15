import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../app.js';
import { uniqueEmail, getAdminToken } from './helpers.js';

describe('Валидация входных данных (zod)', () => {
  let adminToken;
  beforeAll(async () => {
    adminToken = await getAdminToken();
  });
  const auth = () => ({ Authorization: `Bearer ${adminToken}` });

  it('регистрация с некорректным e-mail → 400 и поле email в details', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Тест', email: 'не-почта', password: '12345678' });

    expect(res.status).toBe(400);
    expect(res.body.details.map((d) => d.field)).toContain('email');
  });

  it('пароль из 7 символов → 400 и поле password в details', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Короткий', email: uniqueEmail(), password: '1234567' });

    expect(res.status).toBe(400);
    expect(res.body.details.map((d) => d.field)).toContain('password');
  });

  it('пароль длиннее 72 символов → 400 (bcrypt не должен считать мегабайты)', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Длинный', email: uniqueEmail(), password: 'a'.repeat(73) });

    expect(res.status).toBe(400);
  });

  it('регистрация без тела → 400, а не 500', async () => {
    const res = await request(app).post('/api/auth/register');
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Ошибка валидации');
  });

  it('нельзя зарегистрироваться админом через поле role (mass assignment)', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Хакер', email: uniqueEmail(), password: '12345678', role: 'admin' });

    expect(res.status).toBe(201);
    expect(res.body.user.role).toBe('user');

    // и в базе тоже: спрашиваем /me по выданному токену
    const me = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${res.body.token}`);
    expect(me.body.role).toBe('user');
  });

  it('товар с отрицательной ценой → 400 и поле price в details', async () => {
    const res = await request(app)
      .post('/api/products').set(auth())
      .send({ name: 'Мёд', price: -500, category: 'Мёд' });

    expect(res.status).toBe(400);
    expect(res.body.details.map((d) => d.field)).toContain('price');
  });

  it('товар с названием из 10 000 символов → 400', async () => {
    const res = await request(app)
      .post('/api/products').set(auth())
      .send({ name: 'x'.repeat(5000), price: 100 });

    expect(res.status).toBe(400);
  });

  it('цена-строка из формы "3500" приводится к числу (z.coerce) → 201', async () => {
    const res = await request(app)
      .post('/api/products').set(auth())
      .send({ name: 'Мёд из формы', price: '3500', category: 'Мёд' });

    expect(res.status).toBe(201);
    expect(res.body.price).toBe(3500);
    await request(app).delete(`/api/products/${res.body.id}`).set(auth());
  });

  it('лишние поля отбрасываются и не попадают в обработчик', async () => {
    const res = await request(app)
      .post('/api/products').set(auth())
      .send({ name: 'Мёд лишний', price: 100, id: 999999, hacked: true });

    expect(res.status).toBe(201);
    expect(res.body.id).not.toBe(999999);
    expect(res.body).not.toHaveProperty('hacked');
    await request(app).delete(`/api/products/${res.body.id}`).set(auth());
  });

  it('GET /api/products/abc → 400, а не 500', async () => {
    const res = await request(app).get('/api/products/abc');
    expect(res.status).toBe(400);
  });

  it('GET /api/products/-1 и слишком большой id → 400', async () => {
    expect((await request(app).get('/api/products/-1')).status).toBe(400);
    expect((await request(app).get('/api/products/99999999999')).status).toBe(400);
  });

  it('PUT товара без полей (пустое тело) → 400', async () => {
    const res = await request(app).put('/api/products/1').set(auth()).send({});
    expect(res.status).toBe(400);
  });

  it('заявка: объём 5 кг → 400 с понятным сообщением', async () => {
    const res = await request(app)
      .post('/api/orders')
      .send({ name: 'Иван', email: 'ivan@test.kz', quantity: 5 });

    expect(res.status).toBe(400);
    expect(res.body.details[0].message).toMatch(/10 кг/);
  });

  it('заявка с данными формы (пустые строки в необязательных полях) → 201', async () => {
    const res = await request(app)
      .post('/api/orders')
      .send({ name: 'Иван', email: 'ivan@test.kz', quantity: '10', phone: '', product_id: '', date: '', comment: '' });

    expect(res.status).toBe(201);
    expect(res.body.product_id).toBeNull();
  });

  it('PATCH заявки с неизвестным статусом или пустым телом → 400', async () => {
    const order = await request(app).post('/api/orders').send({ name: 'А', email: 'a@test.kz', quantity: 10 });
    const url = `/api/orders/${order.body.id}`;

    expect((await request(app).patch(url).set(auth()).send({ status: 'hacked' })).status).toBe(400);
    expect((await request(app).patch(url).set(auth()).send({})).status).toBe(400);
    expect((await request(app).patch(url).set(auth()).send({ status: 'done' })).status).toBe(200);
  });
});
