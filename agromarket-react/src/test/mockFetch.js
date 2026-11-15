import { vi } from 'vitest';

// Ответ «сервера»: Response — стандартный класс, как в настоящем fetch
export function jsonResponse(body, status = 200) {
  return new Response(status === 204 ? null : JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

// Один и тот же ответ на любой запрос
export function mockFetch(body, status = 200) {
  return vi.spyOn(globalThis, 'fetch').mockImplementation(async () => jsonResponse(body, status));
}

// Разные ответы по адресу: routes = { '/products': [..], '/auth/me': {...} }
// Значение-функция (url, options) => Response даёт полный контроль
export function mockRoutes(routes) {
  return vi.spyOn(globalThis, 'fetch').mockImplementation(async (url, options) => {
    const key = Object.keys(routes).find((k) => String(url).includes(k));
    if (!key) return jsonResponse({ error: 'not mocked: ' + url }, 404);
    const r = routes[key];
    return typeof r === 'function' ? r(url, options) : jsonResponse(r);
  });
}
