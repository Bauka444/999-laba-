import { Router } from 'express';
import { pool } from '../db/pool.js';

const router = Router();

// GET /api/categories — категории и количество товаров в каждой.
// У товаров без категории (category IS NULL) показываем «Без категории».
// Express 5 сам передаёт ошибки async-обработчика в errorHandler — try/catch не нужен
router.get('/', async (req, res) => {
  const { rows } = await pool.query(
    `SELECT COALESCE(category, 'Без категории') AS name, COUNT(*)::int AS count
       FROM products
      GROUP BY COALESCE(category, 'Без категории')
      ORDER BY name`
  );
  res.json(rows);
});

export default router;
