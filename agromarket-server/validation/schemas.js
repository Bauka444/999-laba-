import { z } from 'zod';

// Пустая строка из HTML-формы («не выбрано») → undefined, чтобы поле считалось необязательным
const emptyToUndefined = (v) => (v === '' || v === null ? undefined : v);

const requiredText = (label, min, max) =>
  z.string({ error: `${label} обязательно` })
    .trim()
    .min(min, `${label}: минимум ${min} симв.`)
    .max(max, `${label}: максимум ${max} симв.`);

// ---------- Аккаунт ----------
export const registerSchema = z.object({
  name: requiredText('Имя', 2, 100),
  email: z.string({ error: 'E-mail обязателен' }).trim().toLowerCase().max(254).email('Некорректный e-mail'),
  // bcrypt учитывает только первые 72 байта; верхняя граница не даёт «положить» сервер огромным паролем
  password: z.string({ error: 'Пароль обязателен' })
    .min(8, 'Пароль — минимум 8 символов')
    .max(72, 'Пароль — максимум 72 символа'),
});

export const loginSchema = z.object({
  email: z.string({ error: 'E-mail обязателен' }).trim().toLowerCase().max(254).email('Некорректный e-mail'),
  password: z.string({ error: 'Пароль обязателен' }).min(1, 'Пароль обязателен').max(72),
});

// ---------- Товары ----------
// Поля — те же, что в таблице products (name, category, price, unit, image)
export const productSchema = z.object({
  name: requiredText('Название', 2, 200),
  category: z.preprocess(emptyToUndefined, z.string().trim().max(50).optional()),
  // z.coerce: из React-формы цена может прийти строкой "3500". В БД price — INTEGER, поэтому .int()
  price: z.coerce.number({ error: 'Цена должна быть числом' })
    .int('Цена — целое число')
    .positive('Цена должна быть больше 0')
    .max(10_000_000, 'Цена слишком большая'),
  unit: z.preprocess(emptyToUndefined, z.string().trim().min(1).max(20).optional()),
  image: z.preprocess(emptyToUndefined, z.string().trim().max(500).optional()),
});

// Для PATCH: все поля необязательны, но хотя бы одно должно быть
export const productUpdateSchema = productSchema
  .partial()
  .refine((d) => Object.keys(d).length > 0, 'Нет полей для обновления');

// ---------- Заявки ----------
export const orderSchema = z.object({
  product_id: z.preprocess(emptyToUndefined, z.coerce.number().int().positive().max(2_147_483_647).optional()),
  name: requiredText('Имя', 1, 100),
  email: z.string({ error: 'E-mail обязателен' }).trim().max(254).email('Некорректный e-mail'),
  phone: z.preprocess(emptyToUndefined, z.string().trim().max(30).optional()),
  quantity: z.coerce.number({ error: 'Объём должен быть числом' })
    .int('Объём — целое число')
    .min(10, 'Минимальный объём заказа — 10 кг')
    .max(1_000_000, 'Объём слишком большой'),
  date: z.preprocess(emptyToUndefined, z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Дата в формате ГГГГ-ММ-ДД').optional()),
  comment: z.preprocess(emptyToUndefined, z.string().trim().max(1000).optional()),
});

export const orderStatusSchema = z.object({
  status: z.enum(['new', 'processing', 'done', 'cancelled'], {
    error: 'Допустимые статусы: new, processing, done, cancelled',
  }),
});
