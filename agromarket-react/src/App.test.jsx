import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';
import { mockFetch, mockRoutes } from './test/mockFetch';

const products = [
  { id: 1, name: 'Мёд гречишный', price: 3500, category: 'Мёд' },
  { id: 2, name: 'Пшеница 3 класса', price: 120, category: 'Зерно' },
];

describe('Каталог (App): три состояния экрана', () => {
  test('сначала «Загрузка...», потом товары', async () => {
    mockFetch(products);
    render(<App />);

    expect(screen.getByText(/загрузка/i)).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: 'Мёд гречишный' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Пшеница 3 класса' })).toBeInTheDocument();
    expect(screen.queryByText(/загрузка/i)).not.toBeInTheDocument();
    expect(screen.getAllByTestId('product-card')).toHaveLength(2);
  });

  test('запрашивает /products с limit=100', async () => {
    const spy = mockFetch(products);
    render(<App />);
    await screen.findByRole('heading', { name: 'Мёд гречишный' });

    expect(spy).toHaveBeenCalledTimes(2);   // каталог + список в форме заявки
    expect(String(spy.mock.calls[0][0])).toMatch(/\/products\?limit=100/);
  });

  test('ошибка сервера 500: сообщение вместо карточек', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    mockFetch({ error: 'Внутренняя ошибка сервера' }, 500);
    render(<App />);

    expect(await screen.findByText('Не удалось загрузить товары')).toBeInTheDocument();
    expect(screen.queryByTestId('product-card')).not.toBeInTheDocument();
  });

  test('сеть недоступна (fetch отклоняется): то же сообщение об ошибке', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'));
    render(<App />);

    expect(await screen.findByText('Не удалось загрузить товары')).toBeInTheDocument();
  });

  test('сервер вернул []: «Товаров пока нет»', async () => {
    mockFetch([]);
    render(<App />);
    expect(await screen.findByText('Товаров пока нет')).toBeInTheDocument();
  });

  test('поиск фильтрует карточки, а при отсутствии совпадений — «Ничего не найдено»', async () => {
    const user = userEvent.setup();
    mockFetch(products);
    render(<App />);
    await screen.findByRole('heading', { name: 'Мёд гречишный' });

    await user.type(screen.getByRole('searchbox', { name: 'Поиск товара' }), 'пшен');
    expect(screen.queryByRole('heading', { name: 'Мёд гречишный' })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Пшеница 3 класса' })).toBeInTheDocument();

    await user.type(screen.getByRole('searchbox'), 'ъъъ');
    expect(screen.getByText('Ничего не найдено')).toBeInTheDocument();
  });

  test('«В корзину» увеличивает счётчик в шапке', async () => {
    const user = userEvent.setup();
    mockFetch(products);
    render(<App />);
    await screen.findByRole('heading', { name: 'Мёд гречишный' });
    expect(screen.getByText(/Корзина: 0/)).toBeInTheDocument();

    const [firstButton] = screen.getAllByRole('button', { name: 'В корзину' });
    await user.click(firstButton);
    await user.click(firstButton);

    expect(screen.getByText(/Корзина: 2/)).toBeInTheDocument();
  });
});

describe('Роли и токен (App)', () => {
  test('гость видит форму входа и не видит «Новый товар»', async () => {
    mockFetch(products);
    render(<App />);
    await screen.findByRole('heading', { name: 'Мёд гречишный' });

    expect(screen.getByRole('heading', { name: 'Вход' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Новый товар' })).not.toBeInTheDocument();
  });

  test('покупатель с токеном: запрос /auth/me идёт с Authorization: Bearer', async () => {
    localStorage.setItem('token', 'test-token');
    localStorage.setItem('user', JSON.stringify({ name: 'Айгерим', role: 'user' }));
    const spy = mockRoutes({
      '/auth/me': { id: 2, name: 'Айгерим', role: 'user' },
      '/products': products,
    });
    render(<App />);

    expect(await screen.findByText('Айгерим')).toBeInTheDocument();
    const meCall = spy.mock.calls.find(([url]) => String(url).endsWith('/auth/me'));
    expect(meCall[1].headers.Authorization).toBe('Bearer test-token');
    expect(screen.queryByRole('heading', { name: 'Новый товар' })).not.toBeInTheDocument();
  });

  test('админ видит форму «Новый товар»', async () => {
    localStorage.setItem('token', 'admin-token');
    localStorage.setItem('user', JSON.stringify({ name: 'Админ', role: 'admin' }));
    mockRoutes({ '/auth/me': { id: 1, name: 'Админ', role: 'admin' }, '/products': products });
    render(<App />);

    expect(await screen.findByRole('heading', { name: 'Новый товар' })).toBeInTheDocument();
  });

  test('«Выйти» удаляет токен и возвращает форму входа', async () => {
    const user = userEvent.setup();
    localStorage.setItem('token', 'test-token');
    localStorage.setItem('user', JSON.stringify({ name: 'Айгерим', role: 'user' }));
    mockRoutes({ '/auth/me': { id: 2, name: 'Айгерим', role: 'user' }, '/products': products });
    render(<App />);

    await user.click(await screen.findByRole('button', { name: 'Выйти' }));

    expect(localStorage.getItem('token')).toBeNull();
    expect(screen.getByRole('heading', { name: 'Вход' })).toBeInTheDocument();
  });

  test('битый JSON в localStorage не роняет приложение', async () => {
    localStorage.setItem('user', '{не json');
    mockFetch(products);
    render(<App />);
    expect(await screen.findByRole('heading', { name: 'Мёд гречишный' })).toBeInTheDocument();
  });
});
