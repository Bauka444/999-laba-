import { Router } from 'express';
import { pool } from '../db/pool.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validate, idParam } from '../middleware/validate.js';
import { orderSchema, orderStatusSchema } from '../validation/schemas.js';

const router = Router();
const adminOnly = [requireAuth, requireRole('admin')];

// GET /api/orders?status=new — заявки вместе с названием товара
router.get('/', adminOnly, async (req, res) => {
  const status = req.query.status || null; // бонус: фильтр по статусу

  const { rows } = await pool.query(
    `SELECT o.*, p.name AS product_name
     FROM orders o
     LEFT JOIN products p ON p.id = o.product_id
     WHERE ($1::text IS NULL OR o.status = $1)
     ORDER BY o.created_at DESC`,
    [status]
  );
  res.json(rows);
});

// POST /api/orders — новая заявка (форма из React)
router.post('/', validate(orderSchema), async (req, res) => {
  const { product_id, name, email, phone, quantity, date, comment } = req.body;

  const { rows } = await pool.query(
    `INSERT INTO orders (product_id, name, email, phone, quantity, delivery_date, comment)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [product_id || null, name, email, phone || null,
     quantity, date || null, comment || null]
  );
  res.status(201).json(rows[0]);
});

// PATCH /api/orders/3   тело: { "status": "processing" }
router.patch('/:id', adminOnly, idParam, validate(orderStatusSchema), async (req, res) => {
  const { status } = req.body;

  const { rows } = await pool.query(
    'UPDATE orders SET status = $1 WHERE id = $2 RETURNING *',
    [status, req.params.id]
  );

  if (rows.length === 0) {
    return res.status(404).json({ error: 'Заявка не найдена' });
  }
  res.json(rows[0]);
});

export default router;
