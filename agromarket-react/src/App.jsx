import { useState, useEffect } from 'react';
import Header from './components/Header';
import Footer from './components/Footer';
import ProductCard from './components/ProductCard';
import ContactForm from './components/ContactForm';
import LoginForm from './components/LoginForm.jsx';
import AddProductForm from './components/AddProductForm.jsx';
import { API_URL, apiFetch } from './api.js';

// Безопасное чтение пользователя: битый JSON в localStorage не должен ронять приложение
function readStoredUser() {
  try {
    return JSON.parse(localStorage.getItem('user') || 'null');
  } catch {
    return null;
  }
}

function App() {
  const [products, setProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [cartCount, setCartCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(readStoredUser);

  function handleLogin(user, token) {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    setUser(user);
  }

  function handleLogout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  }

  // Проверяем сохранённый токен при открытии страницы
  useEffect(() => {
    if (!localStorage.getItem('token')) return;   // не входили — проверять нечего
    apiFetch('/auth/me')
      .then((me) => {
        setUser(me);
        localStorage.setItem('user', JSON.stringify(me));
      })
      .catch(() => {});   // при 401 apiFetch сам выполнит выход
  }, []);

  useEffect(() => {
    async function loadProducts() {
      try {
        const response = await fetch(`${API_URL}/products?limit=100`);
        if (!response.ok) {
          throw new Error('Ошибка сервера: ' + response.status);
        }
        const data = await response.json();
        setProducts(data);
        setLoading(false);
      } catch (err) {
        console.error(err);
        setError('Не удалось загрузить товары');
        setLoading(false);
      }
    }
    loadProducts();
  }, []);

  function handleAddToCart() {
    setCartCount(cartCount + 1);
  }

  const filteredProducts = products.filter((product) =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <>
      <Header cartCount={cartCount} />

      <div className="auth-bar">
        {user ? (
          <>
            <span>Вы вошли как <b>{user.name}</b> ({user.role})</span>
            <button onClick={handleLogout}>Выйти</button>
          </>
        ) : (
          <LoginForm onLogin={handleLogin} />
        )}
      </div>

      <main className="page">
        <section id="catalog" className="catalog">
          <div className="catalog-toolbar">
            <h2>Каталог</h2>
            <input
              type="search"
              placeholder="Поиск товара..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {user?.role === 'admin' && (
            <AddProductForm onAdded={(p) => setProducts((prev) => [...prev, p])} />
          )}

          {loading && <p className="status">Загрузка...</p>}
          {error && <p className="error">{error}</p>}

          <div className="product-grid">
            {!loading && !error &&
              filteredProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onAdd={handleAddToCart}
                  featured={product.id === 1}
                />
              ))}
          </div>
        </section>

        <aside id="delivery" className="sidebar">
          <h3>Доставка</h3>
          <ul>
            <li>Астана — на следующий день</li>
            <li>Акмолинская область — 2–3 дня</li>
            <li>Бесплатно от 20 000 тг</li>
          </ul>
        </aside>

        <ContactForm />
      </main>

      <Footer />
    </>
  );
}

export default App;
