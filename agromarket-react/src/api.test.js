import { apiFetch } from './api';
import { mockFetch } from './test/mockFetch';

describe('apiFetch', () => {
  test('добавляет Authorization, если в localStorage есть токен', async () => {
    localStorage.setItem('token', 'test-token');
    const spy = mockFetch({ ok: true });

    await apiFetch('/auth/me');

    expect(spy.mock.calls[0][1].headers.Authorization).toBe('Bearer test-token');
  });

  test('без токена заголовка Authorization нет', async () => {
    const spy = mockFetch({ ok: true });
    await apiFetch('/products');
    expect(spy.mock.calls[0][1].headers.Authorization).toBeUndefined();
  });

  test('ошибка API становится исключением с текстом, status и details', async () => {
    mockFetch({ error: 'Ошибка валидации', details: [{ field: 'price', message: 'Цена должна быть больше 0' }] }, 400);

    const err = await apiFetch('/products', { method: 'POST' }).catch((e) => e);

    expect(err.message).toBe('Ошибка валидации');
    expect(err.status).toBe(400);
    expect(err.details).toEqual([{ field: 'price', message: 'Цена должна быть больше 0' }]);
  });

  test('ответ без JSON: понятное сообщение «Ошибка 502»', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('<html>Bad Gateway</html>', { status: 502 }));
    await expect(apiFetch('/products')).rejects.toThrow('Ошибка 502');
  });

  test('401 при наличии токена: токен и пользователь удаляются, страница перезагружается', async () => {
    localStorage.setItem('token', 'expired');
    localStorage.setItem('user', '{"name":"X"}');
    const reload = vi.fn();
    vi.stubGlobal('location', { ...window.location, reload });
    mockFetch({ error: 'Срок действия токена истёк, войдите снова' }, 401);

    await expect(apiFetch('/auth/me')).rejects.toThrow(/истёк/);

    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('user')).toBeNull();
    expect(reload).toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  test('204 без тела возвращает null', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 204 }));
    expect(await apiFetch('/products/1', { method: 'DELETE' })).toBeNull();
  });
});
