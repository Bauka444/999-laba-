import { useState } from 'react';
import { apiFetch } from '../api.js';
import FormErrors from './FormErrors.jsx';

export default function AddProductForm({ onAdded }) {
  const [error, setError] = useState('');
  const [details, setDetails] = useState([]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setDetails([]);
    const form = e.target;
    const data = Object.fromEntries(new FormData(form));

    try {
      const product = await apiFetch('/products', {
        method: 'POST',
        body: JSON.stringify({ ...data, price: Number(data.price) }),
      });

      onAdded(product);   // сообщаем App о новом товаре
      form.reset();
    } catch (err) {
      setError(err.message);
      setDetails(err.details || []);
    }
  }

  return (
    <form className="admin-form" onSubmit={handleSubmit}>
      <h3>Новый товар</h3>
      <input name="name" placeholder="Название" aria-label="Название" required />
      <input name="category" placeholder="Категория" aria-label="Категория" />
      <input name="price" type="number" min="0" step="1" placeholder="Цена, ₸" aria-label="Цена" required />
      <input name="unit" placeholder="Единица (кг, л)" aria-label="Единица" defaultValue="кг" />
      <FormErrors error={error} details={details} />
      <button type="submit">Добавить</button>
    </form>
  );
}
