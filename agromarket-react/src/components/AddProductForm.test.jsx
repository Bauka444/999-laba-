import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AddProductForm from './AddProductForm';
import { mockFetch } from '../test/mockFetch';

describe('AddProductForm', () => {
  test('отправляет товар с токеном админа, цена уходит числом, форма очищается', async () => {
    const user = userEvent.setup();
    localStorage.setItem('token', 'admin-token');
    const created = { id: 10, name: 'Сыр', price: 4200, unit: 'кг' };
    const spy = mockFetch(created, 201);
    const onAdded = vi.fn();
    render(<AddProductForm onAdded={onAdded} />);

    await user.type(screen.getByLabelText('Название'), 'Сыр');
    await user.type(screen.getByLabelText('Цена'), '4200');
    await user.click(screen.getByRole('button', { name: 'Добавить' }));

    const [url, options] = spy.mock.calls[0];
    expect(String(url)).toMatch(/\/products$/);
    expect(options.method).toBe('POST');
    expect(options.headers.Authorization).toBe('Bearer admin-token');
    expect(JSON.parse(options.body).price).toBe(4200);
    expect(onAdded).toHaveBeenCalledWith(created);
    expect(screen.getByLabelText('Название')).toHaveValue('');
  });

  test('ошибка валидации сервера (400 + details) показывается у формы, onAdded не вызывается', async () => {
    const user = userEvent.setup();
    mockFetch({ error: 'Ошибка валидации', details: [{ field: 'price', message: 'Цена должна быть больше 0' }] }, 400);
    const onAdded = vi.fn();
    render(<AddProductForm onAdded={onAdded} />);

    await user.type(screen.getByLabelText('Название'), 'Сыр');
    await user.type(screen.getByLabelText('Цена'), '0');
    await user.click(screen.getByRole('button', { name: 'Добавить' }));

    expect(await screen.findByText('Цена должна быть больше 0')).toBeInTheDocument();
    expect(onAdded).not.toHaveBeenCalled();
  });
});
