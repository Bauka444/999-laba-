// Проверяет req.body по схеме zod. При ошибке — 400 и список проблемных полей.
// При успехе в req.body кладём ОЧИЩЕННЫЕ данные: лишние поля (например, role) отброшены.
export const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body ?? {});   // в Express 5 без тела req.body === undefined
  if (!result.success) {
    return res.status(400).json({
      error: 'Ошибка валидации',
      details: result.error.issues.map((i) => ({
        field: i.path.join('.'),
        message: i.message,
      })),
    });
  }
  req.body = result.data;
  next();
};

// /api/products/abc, /api/products/-1 и слишком большой id не должны доходить до базы
export const idParam = (req, res, next) => {
  const id = Number(req.params.id);
  // 2147483647 — максимум PostgreSQL INTEGER; больше — ошибка базы, то есть 500
  if (!Number.isInteger(id) || id <= 0 || id > 2_147_483_647) {
    return res.status(400).json({ error: 'Некорректный id' });
  }
  req.params.id = id;
  next();
};
