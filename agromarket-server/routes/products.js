import { Router } from 'express';
import { pool } from '../db/pool.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validate, idParam } from '../middleware/validate.js';
import { productSchema } from '../validation/schemas.js';

const router = Router();
const adminOnly = [requireAuth, requireRole('admin')];   // цепочка из двух middleware

// Бонус: «белый список» столбцов для сортировки.
// Имя столбца нельзя передать через $1, поэтому подставляем только значение из этого объекта.
const SORT_COLUMNS = { id: 'id', price: 'price', name: 'name' };

// GET /api/products?search=мол&sort=-price&limit=10&offset=0&maxPrice=5000
router.get('/', async (req, res) => {
  const search = req.query.search || '';

  const sortParam = String(req.query.sort || 'id');
  const desc = sortParam.startsWith('-');
  const column = SORT_COLUMNS[desc ? sortParam.slice(1) : sortParam] ?? 'id';
  const direction = desc ? 'DESC' : 'ASC';

  // По умолчанию limit=20, но не больше 100
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);
  const offset = Math.max(parseInt(req.query.offset, 10) || 0, 0);

  const maxPriceRaw = Number(req.query.maxPrice);
  const maxPrice = req.query.maxPrice && !Number.isNaN(maxPriceRaw) ? maxPriceRaw : null;

  const { rows } = await pool.query(
    `SELECT * FROM products
     WHERE name ILIKE $1 AND ($4::int IS NULL OR price <= $4::int)
     ORDER BY ${column} ${direction}, id
     LIMIT $2 OFFSET $3`,
    [`%${search}%`, limit, offset, maxPrice]
  );
  res.json(rows);
});

// GET /api/products/2
router.get('/:id', idParam, async (req, res) => {
  const { rows } = await pool.query(
    'SELECT * FROM products WHERE id = $1',
    [req.params.id]
  );
  if (rows.length === 0) {
    return res.status(404).json({ error: 'Товар не найден' });
  }
  res.json(rows[0]);
});

// POST /api/products — новый товар
router.post('/', adminOnly, validate(productSchema), async (req, res) => {
  const { name, category, price, unit, image } = req.body;
  const { rows } = await pool.query(
    `INSERT INTO products (name, category, price, unit, image)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [name, category ?? null, price, unit ?? 'кг', image ?? null]
  );
  res.status(201).json(rows[0]); // вернули созданный товар вместе с новым id
});

// PUT /api/products/5 — заменить товар целиком
router.put('/:id', adminOnly, idParam, validate(productSchema), async (req, res) => {
  const { name, category, price, unit, image } = req.body;
  const { rows } = await pool.query(
    `UPDATE products
     SET name = $1, category = $2, price = $3, unit = $4, image = $5
     WHERE id = $6
     RETURNING *`,
    [name, category ?? null, price, unit ?? 'кг', image ?? null, req.params.id]
  );
  if (rows.length === 0) {
    return res.status(404).json({ error: 'Товар не найден' });
  }
  res.json(rows[0]);
});

// DELETE /api/products/5
router.delete('/:id', adminOnly, idParam, async (req, res) => {
  const { rowCount } = await pool.query(
    'DELETE FROM products WHERE id = $1',
    [req.params.id]
  );

  if (rowCount === 0) {
    return res.status(404).json({ error: 'Товар не найден' });
  }

  res.status(204).end(); // 204 — без тела
});

export default router;
