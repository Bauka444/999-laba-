import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ContactForm from './ContactForm';
import { mockRoutes, jsonResponse } from '../test/mockFetch';

const products = [{ id: 1, name: 'Мёд гречишный' }, { id: 2, name: 'Пшеница' }];

async function fillRequired(user, quantity = '50') {
  await user.type(screen.getByLabelText(/имя/i), 'ТОО Агро');
  await user.type(screen.getByLabelText('Email'), 'buyer@test.kz');
  await user.type(screen.getByLabelText(/объём/i), quantity);
}

describe('ContactForm (оптовая заявка)', () => {
  beforeEach(() => {
    vi.spyOn(window, 'alert').mockImplementation(() => {});
  });

  test('список товаров загружается в <select>', async () => {
    mockRoutes({ '/products': products });
    render(<ContactForm />);

    expect(await screen.findByRole('option', { name: 'Мёд гречишный' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Пшеница' })).toBeInTheDocument();
  });

  test('отправляет заявку на /orders и сообщает номер', async () => {
    const user = userEvent.setup();
    const spy = mockRoutes({
      '/products': products,
      '/orders': () => jsonResponse({ id: 77 }, 201),
    });
    render(<ContactForm />);
    await screen.findByRole('option', { name: 'Пшеница' });

    await fillRequired(user);
    await user.selectOptions(screen.getByLabelText('Товар'), '2');
    await user.click(screen.getByRole('button', { name: 'Отправить заявку' }));

    const post = spy.mock.calls.find(([url]) => String(url).endsWith('/orders'));
    expect(JSON.parse(post[1].body)).toMatchObject({ name: 'ТОО Агро', email: 'buyer@test.kz', quantity: '50', product_id: '2' });
    expect(window.alert).toHaveBeenCalledWith('Заявка №77 принята!');
  });

  test('ошибка валидации сервера выводится в сообщении вместе с details', async () => {
    const user = userEvent.setup();
    mockRoutes({
      '/products': products,
      '/orders': () => jsonResponse({ error: 'Ошибка валидации', details: [{ field: 'quantity', message: 'Минимальный объём заказа — 10 кг' }] }, 400),
    });
    render(<ContactForm />);
    await screen.findByRole('option', { name: 'Пшеница' });

    await fillRequired(user, '10');
    await user.click(screen.getByRole('button', { name: 'Отправить заявку' }));

    expect(window.alert).toHaveBeenCalledWith(expect.stringContaining('Минимальный объём заказа — 10 кг'));
  });

  test('сервер недоступен: сообщение «Сервер недоступен», кнопка снова активна', async () => {
    const user = userEvent.setup();
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
      if (String(url).endsWith('/orders')) throw new TypeError('Failed to fetch');
      return jsonResponse(products);
    });
    render(<ContactForm />);
    await screen.findByRole('option', { name: 'Пшеница' });

    await fillRequired(user);
    await user.click(screen.getByRole('button', { name: 'Отправить заявку' }));

    expect(window.alert).toHaveBeenCalledWith(expect.stringMatching(/недоступен/i));
    expect(screen.getByRole('button', { name: 'Отправить заявку' })).toBeEnabled();
  });
});
