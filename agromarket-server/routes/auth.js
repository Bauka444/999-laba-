import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from '../db/pool.js';
import { requireAuth } from '../middleware/auth.js';
import { loginLimiter, registerLimiter } from '../middleware/rateLimit.js';
import { validate } from '../middleware/validate.js';
import { registerSchema, loginSchema } from '../validation/schemas.js';

const router = Router();

// Фиктивный хэш: если пользователя нет, всё равно тратим время на bcrypt.compare,
// чтобы по времени ответа нельзя было отличить «нет такого email» от «неверный пароль»
const DUMMY_HASH = bcrypt.hashSync('dummy-password', 10);

// Выпускает токен: внутри id и роль, подпись — нашим секретным ключом
function createToken(user) {
  return jwt.sign(
    { sub: String(user.id), role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '2h' }
  );
}

// POST /api/auth/register   { name, email, password }
// Тело уже проверено и очищено zod (validate): name обрезан, email в нижнем регистре,
// лишние поля вроде role отброшены
router.post('/register', registerLimiter, validate(registerSchema), async (req, res) => {
  const { name, email, password } = req.body;

  const passwordHash = await bcrypt.hash(password, 10);

  // role не передаём — база поставит DEFAULT 'user' (защита от mass assignment)
  const { rows } = await pool.query(
    `INSERT INTO users (name, email, password_hash)
     VALUES ($1, $2, $3)
     RETURNING id, name, email, role, created_at`,
    [name, email, passwordHash]
  );
  const user = rows[0];

  // Сразу после регистрации пользователь считается вошедшим
  res.status(201).json({ user, token: createToken(user) });
});

// POST /api/auth/login   { email, password }
router.post('/login', loginLimiter, validate(loginSchema), async (req, res) => {
  const { email, password } = req.body;

  const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
  const user = rows[0];

  // Пользователь найден И пароль совпал с хэшем
  const ok = await bcrypt.compare(password, user ? user.password_hash : DUMMY_HASH)
    && Boolean(user);
  if (!ok) {
    return res.status(401).json({ error: 'Неверный email или пароль' });
  }

  // Убираем хэш из объекта перед отправкой клиенту
  const { password_hash, ...safeUser } = user;
  res.json({ user: safeUser, token: createToken(safeUser) });
});

// GET /api/auth/me — нужен токен
router.get('/me', requireAuth, async (req, res) => {
  const { rows } = await pool.query(
    'SELECT id, name, email, role, created_at FROM users WHERE id = $1',
    [req.user.id]
  );
  if (rows.length === 0) {
    return res.status(404).json({ error: 'Пользователь не найден' });
  }
  res.json(rows[0]);
});

export default router;
