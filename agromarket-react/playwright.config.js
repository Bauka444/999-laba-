import { defineConfig } from '@playwright/test';

const baseURL = process.env.E2E_BASE_URL || 'http://localhost:5173';

export default defineConfig({
  testDir: './e2e',
  timeout: 90_000,               // сервер на бесплатном тарифе может «просыпаться» до минуты
  expect: { timeout: 15_000 },
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL,
    trace: 'retain-on-failure',  // при падении — «запись» каждого шага
    screenshot: 'only-on-failure',
  },
  // Локально (без E2E_BASE_URL) сами поднимаем Vite; API (agromarket-server) запустите отдельно
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : { command: 'npm run dev', url: baseURL, reuseExistingServer: true, timeout: 60_000 },
});
