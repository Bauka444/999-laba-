# АгроМаркет API

![CI](https://github.com/ЛОГИН/agromarket-server/actions/workflows/ci.yml/badge.svg)

## Запуск
1. Установить PostgreSQL, создать базу `agromarket`
2. Скопировать `.env.example` в `.env` и указать свой пароль
3. `npm install`
4. `npm run db:init`        # создать таблицы и загрузить товары (УДАЛЯЕТ все данные — только локально!)
5. `npm run dev`            # http://localhost:3000

## Эндпоинты

| Метод  | Путь                 | Описание                                         | Ответы        |
|--------|----------------------|--------------------------------------------------|---------------|
| GET    | /api/health          | сервер, связь с БД и версия (SHA коммита)        | 200, 503      |
| GET    | /api/categories      | категории и количество товаров в каждой          | 200           |
| GET    | /api/products        | товары, `?search=`, `?sort=`, `?limit=&offset=`, `?maxPrice=` | 200 |
| GET    | /api/products/:id    | один товар                                       | 200, 400, 404 |
| POST   | /api/products        | создать товар                                    | 201, 400      |
| PUT    | /api/products/:id    | изменить товар                                   | 200, 400, 404 |
| DELETE | /api/products/:id    | удалить товар                                    | 204, 404      |
| GET    | /api/orders          | заявки + название товара, `?status=`             | 200           |
| POST   | /api/orders          | новая заявка                                     | 201, 400      |
| PATCH  | /api/orders/:id      | сменить статус заявки                            | 200, 400, 404 |

Примеры: `/api/products?search=мол&sort=-price&limit=10`, `/api/orders?status=new`.

Тесты: коллекция `postman/agromarket.postman_collection.json`
(Postman → Import → Run collection; 11 запросов).

## Лабораторная 6 — ответы

- Ошибки из части 2 (типичные тексты PostgreSQL — сверьте со своим выводом):
  - `price = -5` → `new row for relation "products" violates check constraint "products_price_check"`
    (сработал `CHECK (price >= 0)`);
  - без `name` → `null value in column "name" of relation "products" violates not-null constraint`
    (сработал `NOT NULL`);
  - заявка с `product_id = 9999` → `insert or update on table "orders" violates foreign key constraint "orders_product_id_fkey"`
    (сработал внешний ключ).
  В API они превращаются в 400 через `errorHandler` (коды 23514, 23502, 23503).
- SQL-инъекция: при вклейке `search` прямо в текст запроса адрес `?search=zzz' OR 1=1 --` вернул все
  товары (условие `OR 1=1` истинно, остаток запроса закомментирован), а адрес `?search='` дал 500 из-за
  синтаксической ошибки SQL (в терминале — ошибка PostgreSQL). С параметром `$1` оба адреса возвращают
  200 и пустой массив: значение приходит как данные и не становится частью SQL.
- Двойная защита quantity: без JS-проверки заявка с `quantity: 5` всё равно не сохраняется — сработал
  `CHECK (quantity >= 10)`, и `errorHandler` вернул 400 «Значение не проходит проверку в БД».
  JS-проверка нужна, чтобы дать понятное сообщение и не отправлять заведомо плохой запрос в базу;
  CHECK — последний рубеж, если проверку обойдут или забудут в другом месте кода.
- Что стало с заявкой после удаления товара: заявка осталась, `product_id` стал `NULL`
  (`ON DELETE SET NULL`), а `product_name` в `/api/orders` — `null` (поэтому `LEFT JOIN`).
- Использовал(а) ли ИИ и для чего: да, ИИ (Claude) использован для написания кода по заданию
  лабораторной; код прочитан и разобран.

## Структура

    db/           schema.sql, pool.js, seed.js (с нуля), migrate.js (безопасно, идемпотентно)
    scripts/      smoke.js — проверка живого продакшена после деплоя
    data/         db.json (начальные данные)
    middleware/   logger.js, errorHandler.js
    routes/       products.js, orders.js, auth.js, categories.js
    postman/      коллекция с автотестами
    app.js        приложение Express (без запуска) — его импортируют тесты
    server.js     загрузка .env и app.listen
    tests/        автотесты Vitest + Supertest
    .github/      CI (workflows/ci.yml) и шаблон Pull Request

## Бонус
Пагинация (`limit` по умолчанию 20, максимум 100), сортировка через белый список столбцов,
фильтр заявок по статусу, выбор товара в форме React (`<select name="product_id">`).

## Переменные окружения (.env)

- `JWT_SECRET` — случайная строка 64 символа (`node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`)
- `JWT_EXPIRES_IN` — срок жизни токена, например `2h`
- `ADMIN_EMAIL` / `ADMIN_PASSWORD` — администратор, создаётся командой `npm run db:init`

## Эндпоинты (новые и изменённые)

| Метод  | Путь                | Доступ | Ответы                  |
|--------|---------------------|--------|-------------------------|
| POST   | /api/auth/register  | все    | 201, 400, 409           |
| POST   | /api/auth/login     | все    | 200, 400, 401, 429      |
| GET    | /api/auth/me        | токен  | 200, 401                |
| POST   | /api/products       | admin  | 201, 400, 401, 403      |
| PUT    | /api/products/:id   | admin  | 200, 400, 401, 403, 404 |
| DELETE | /api/products/:id   | admin  | 204, 401, 403, 404      |
| GET    | /api/orders         | admin  | 200, 401, 403           |
| PATCH  | /api/orders/:id     | admin  | 200, 400, 401, 403, 404 |

## Лабораторная 7 — ответы

- Одинаковые ли хэши у двух пользователей с одним паролем и почему: нет — bcrypt добавляет случайную соль и хранит её внутри хэша.
- Что вернул сервер на регистрацию с `"role": "admin"`: 201, но роль `user` — поле role из тела запроса не читается (защита от mass assignment).
- Почему подделанный на jwt.io токен не прошёл: после смены payload подпись не совпала с подписью, посчитанной секретом JWT_SECRET, → 401 «Недействительный токен».
- Что произошло после порчи токена в localStorage: `/auth/me` вернул 401, `apiFetch` удалил token и user и перезагрузил страницу — пользователь вышел.
- Почему спрятать кнопку в React недостаточно: клиентский код может изменить кто угодно (fetch из Console, Postman, curl); реальная защита — `requireAuth` + `requireRole` на сервере (403).
- Использовал(а) ли ИИ и для чего: ...

## Тестирование
1. Создать базу `agromarket_test` (pgAdmin или psql)
2. Скопировать `.env.test.example` в `.env.test` и указать пароль от PostgreSQL
3. `npm test` — все тесты, `npm run test:watch` — режим наблюдения,
   `npm run coverage` — отчёт о покрытии (сейчас: Lines ...%)

## Правила работы с Git
- Ветка `main` защищена: изменения — только через Pull Request
- PR сливается после зелёного CI и одобрения ревьюера
- Ветки: `feature/...`, `fix/...`; коммиты: feat, fix, test, refactor, docs, ci, chore

## Лабораторная 8 — ответы
- Какие тесты упали, когда убрали adminOnly у POST, и почему: ...
- Покрытие (Lines) и одна непокрытая строка — почему её не проверяет ни один тест: ...
- Чем наш unit-тест requireRole отличается от интеграционного теста в access.test.js: ...
- Какие замечания я получил(а) на code-review и что исправил(а): ...
- Какие замечания я оставил(а) напарнику: ...
- Использовал(а) ли ИИ и для чего: ...

## Продакшен

- Сайт: https://agromarket-ЛОГИН.vercel.app
- API: https://agromarket-api-ЛОГИН.onrender.com/api/health
- Схема: React (Vercel) → Express (Render, Frankfurt) → PostgreSQL (Neon, Frankfurt)

### Переменные окружения (значения — только в панелях сервисов)

| Переменная | Где задана | Секрет |
|---|---|---|
| DATABASE_URL | Render | да |
| JWT_SECRET | Render | да |
| JWT_EXPIRES_IN | Render | нет |
| CORS_ORIGIN | Render | нет |
| NODE_ENV=production | Render | нет |
| VITE_API_URL | Vercel | нет |
| RENDER_DEPLOY_HOOK_URL | GitHub Secrets | да |
| API_URL, FRONTEND_URL | GitHub Variables | нет |

### Как происходит деплой
1. Изменения — только через Pull Request: CI + ревью
2. Merge в main → CI: test → deploy (Render deploy hook, ref = SHA) → smoke
3. React собирается Vercel из main автоматически
4. Авария: Rollback на Render, затем git revert через PR

### Команды базы
- `npm run db:init` — DROP + CREATE + данные. Локально и в CI; на облачной базе только с `--force`.
- `npm run db:migrate` — `CREATE TABLE IF NOT EXISTS`, данные не трогает. Запускается при каждом старте на Render.

## Лабораторная 9 — ответы

- Что напечатал предохранитель seed.js на облачной базе и зачем он нужен: ...
- Почему на Vercel сначала не загрузился каталог и как исправили: ...
- Почему в PR job deploy — skipped; почему каталог не работает на Preview Vercel: ...
- Время конвейера от Merge до зелёного smoke: ... мин
- Работал ли сайт во время «сломанного» деплоя с JWT_SECRET=123 и почему: ...
- Rollback или git revert — что вы сделаете ночью при аварии и что утром: ...
- Аудит (часть 7):
  1. Секретов в истории Git нет: ...
  2. Ошибки не раскрывают детали (`/api/products/abc` на проде и локально): ...
  3. Заголовки безопасности (strict-transport-security, x-content-type-options, нет x-powered-by): ...
  4. HTTP → HTTPS: ...
  5. Вход с Admin12345 на продакшене даёт 401: ...
  6. Лимит попыток входа (6-й ответ 429): ...
  7. Резервные копии Neon — на сколько часов назад: ...
- Холодный старт: первый ответ ... с, повторный ... с, почему: ...
- Использовал(а) ли ИИ и для чего: ...
