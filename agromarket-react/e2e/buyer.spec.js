import { test, expect } from '@playwright/test';

// Каждый запуск — новый покупатель: тест создаёт только своего пользователя и не трогает чужие данные
const email = `e2e+${Date.now()}@agromarket.test`;
const password = 'E2e-Test-Password-123';

test('каталог загружается с сервера', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/АгроМаркет/i);
  await expect(page.getByTestId('product-card').first()).toBeVisible();
});

test('прямая ссылка на внутренний адрес не даёт 404 (rewrites в vercel.json)', async ({ page }) => {
  const response = await page.goto('/login');
  expect(response.status()).toBe(200);
  await expect(page.getByRole('link', { name: /АгроМаркет/ }).first()).toBeVisible();
});

test('гость не видит форму добавления товара', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('product-card').first()).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Вход' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Новый товар' })).toHaveCount(0);
});

test('покупатель регистрируется, кладёт товар в корзину, оформляет заявку и выходит', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('product-card').first()).toBeVisible();

  // 1. Регистрация (форма входа переключается на регистрацию)
  const auth = page.locator('.login-form');
  await auth.getByRole('button', { name: /нет аккаунта/i }).click();
  await auth.getByLabel('Имя', { exact: true }).fill('E2E Покупатель');
  await auth.getByLabel('Email').fill(email);
  await auth.getByLabel('Пароль').fill(password);
  await auth.getByRole('button', { name: 'Зарегистрироваться' }).click();

  // 2. Пользователь вошёл
  await expect(page.getByText(/Вы вошли как/)).toContainText('E2E Покупатель');
  await expect(page.getByRole('button', { name: 'Выйти' })).toBeVisible();

  // 3. Корзина
  await page.getByRole('button', { name: 'В корзину' }).first().click();
  await expect(page.getByText(/Корзина: 1/)).toBeVisible();

  // 4. Оптовая заявка
  const contact = page.locator('#contact');
  await expect(contact.locator('#product_id option').nth(1)).toBeAttached();   // товары в <select> загрузились
  await contact.getByLabel('Имя / организация').fill('E2E ТОО');
  await contact.getByLabel('Email').fill(email);
  await contact.locator('#product_id').selectOption({ index: 1 });
  await contact.getByLabel(/Объём заказа/).fill('25');

  const dialogPromise = page.waitForEvent('dialog');   // приложение сообщает результат через alert
  await contact.getByRole('button', { name: 'Отправить заявку' }).click();
  const dialog = await dialogPromise;
  expect(dialog.message()).toMatch(/Заявка №\d+ принята/);
  await dialog.accept();

  // 5. Токен сохранился: после перезагрузки пользователь всё ещё вошёл
  await page.reload();
  await expect(page.getByText(/Вы вошли как/)).toContainText('E2E Покупатель');

  // 6. Выход
  await page.getByRole('button', { name: 'Выйти' }).click();
  await expect(page.getByRole('heading', { name: 'Вход' })).toBeVisible();
});

test('вход с неверным паролем показывает ошибку', async ({ page }) => {
  await page.goto('/');
  const auth = page.locator('.login-form');
  await auth.getByLabel('Email').fill(`nobody+${Date.now()}@agromarket.test`);
  await auth.getByLabel('Пароль').fill('wrong-password-123');
  await auth.getByRole('button', { name: 'Войти' }).click();

  // 401 «Неверный email или пароль»; при 429 (лимит из ЛР7) текст другой, но это тоже ошибка
  await expect(auth.getByRole('alert')).toBeVisible();
});
