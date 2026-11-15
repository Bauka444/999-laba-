import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LoginForm from './LoginForm';
import { mockFetch } from '../test/mockFetch';

const okResult = { user: { id: 2, name: 'Айгерим', email: 'a@test.kz', role: 'user' }, token: 'jwt-token' };

describe('LoginForm', () => {
  test('вход: отправляет e-mail и пароль на /auth/login и вызывает onLogin', async () => {
    const user = userEvent.setup();
    const onLogin = vi.fn();
    const spy = mockFetch(okResult);
    render(<LoginForm onLogin={onLogin} />);

    await user.type(screen.getByLabelText('Email'), 'a@test.kz');
    await user.type(screen.getByLabelText('Пароль'), 'secret123');
    await user.click(screen.getByRole('button', { name: 'Войти' }));

    expect(String(spy.mock.calls[0][0])).toMatch(/\/auth\/login$/);
    expect(JSON.parse(spy.mock.calls[0][1].body)).toEqual({ email: 'a@test.kz', password: 'secret123' });
    expect(onLogin).toHaveBeenCalledWith(okResult.user, 'jwt-token');
  });

  test('неверный пароль (401): показывает ошибку сервера, onLogin не вызывается', async () => {
    const user = userEvent.setup();
    const onLogin = vi.fn();
    mockFetch({ error: 'Неверный email или пароль' }, 401);
    render(<LoginForm onLogin={onLogin} />);

    await user.type(screen.getByLabelText('Email'), 'a@test.kz');
    await user.type(screen.getByLabelText('Пароль'), 'wrong-password');
    await user.click(screen.getByRole('button', { name: 'Войти' }));

    expect(await screen.findByText('Неверный email или пароль')).toBeInTheDocument();
    expect(onLogin).not.toHaveBeenCalled();
  });

  test('429: показывает текст из ответа сервера, а не «что-то пошло не так»', async () => {
    const user = userEvent.setup();
    mockFetch({ error: 'Слишком много попыток входа. Попробуйте через 15 минут' }, 429);
    render(<LoginForm onLogin={() => {}} />);

    await user.type(screen.getByLabelText('Email'), 'a@test.kz');
    await user.type(screen.getByLabelText('Пароль'), 'wrong-password');
    await user.click(screen.getByRole('button', { name: 'Войти' }));

    expect(await screen.findByText(/Слишком много попыток входа/)).toBeInTheDocument();
  });

  test('переключение на регистрацию показывает поле «Имя» и меняет кнопку', async () => {
    const user = userEvent.setup();
    render(<LoginForm onLogin={() => {}} />);
    expect(screen.queryByLabelText('Имя')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /нет аккаунта/i }));

    expect(screen.getByLabelText('Имя')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Зарегистрироваться' })).toBeInTheDocument();
  });

  test('регистрация: ошибки валидации (details) выводятся списком', async () => {
    const user = userEvent.setup();
    mockFetch({
      error: 'Ошибка валидации',
      details: [{ field: 'email', message: 'Некорректный e-mail' }, { field: 'password', message: 'Пароль — минимум 8 символов' }],
    }, 400);
    render(<LoginForm onLogin={() => {}} />);

    await user.click(screen.getByRole('button', { name: /нет аккаунта/i }));
    await user.type(screen.getByLabelText('Имя'), 'Тест');
    await user.type(screen.getByLabelText('Email'), 'a@test.kz');
    await user.type(screen.getByLabelText('Пароль'), '12345678');
    await user.click(screen.getByRole('button', { name: 'Зарегистрироваться' }));

    expect(await screen.findByText('Некорректный e-mail')).toBeInTheDocument();
    expect(screen.getByText('Пароль — минимум 8 символов')).toBeInTheDocument();
  });

  test('пустая форма не отправляется (required): fetch не вызывается', async () => {
    const user = userEvent.setup();
    const spy = mockFetch(okResult);
    render(<LoginForm onLogin={() => {}} />);

    await user.click(screen.getByRole('button', { name: 'Войти' }));

    expect(spy).not.toHaveBeenCalled();
  });

  test('пока идёт запрос, кнопка заблокирована и написано «Подождите…»', async () => {
    const user = userEvent.setup();
    vi.spyOn(globalThis, 'fetch').mockImplementation(() => new Promise(() => {}));   // ответ не приходит
    render(<LoginForm onLogin={() => {}} />);

    await user.type(screen.getByLabelText('Email'), 'a@test.kz');
    await user.type(screen.getByLabelText('Пароль'), 'secret123');
    await user.click(screen.getByRole('button', { name: 'Войти' }));

    expect(await screen.findByRole('button', { name: /подождите/i })).toBeDisabled();
  });
});
