import { useState } from 'react';
import { apiFetch } from '../api.js';
import FormErrors from './FormErrors.jsx';

export default function LoginForm({ onLogin }) {
  const [mode, setMode] = useState('login');      // 'login' или 'register'
  const [error, setError] = useState('');
  const [details, setDetails] = useState([]);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setDetails([]);
    setLoading(true);
    const data = Object.fromEntries(new FormData(e.target));

    try {
      // /auth/login или /auth/register — оба возвращают { user, token }
      const result = await apiFetch(`/auth/${mode}`, {
        method: 'POST',
        body: JSON.stringify(data),
      });
      onLogin(result.user, result.token);
    } catch (err) {
      setError(err.message);
      setDetails(err.details || []);
    } finally {
      setLoading(false);
    }
  }

  const isLogin = mode === 'login';

  return (
    <form className="login-form" onSubmit={handleSubmit}>
      <h3>{isLogin ? 'Вход' : 'Регистрация'}</h3>

      {!isLogin && <input name="name" placeholder="Имя" aria-label="Имя" required />}
      <input name="email" type="email" placeholder="Email" aria-label="Email" required />
      <input name="password" type="password" placeholder="Пароль (от 8 символов)"
             aria-label="Пароль" required minLength={8} />

      <FormErrors error={error} details={details} />

      <button type="submit" disabled={loading}>
        {loading ? 'Подождите…' : isLogin ? 'Войти' : 'Зарегистрироваться'}
      </button>
      <button type="button" onClick={() => setMode(isLogin ? 'register' : 'login')}>
        {isLogin ? 'Нет аккаунта? Регистрация' : 'Уже есть аккаунт? Войти'}
      </button>
    </form>
  );
}
