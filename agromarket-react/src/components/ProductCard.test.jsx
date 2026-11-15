import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ProductCard from './ProductCard';

const product = { id: 1, name: 'Мёд гречишный', price: 3500, category: 'Мёд', image: 'https://img.test/honey.jpg' };

describe('ProductCard', () => {
  test('показывает название, цену и картинку с alt', () => {
    render(<ProductCard product={product} onAdd={() => {}} />);

    expect(screen.getByRole('heading', { name: 'Мёд гречишный' })).toBeInTheDocument();
    expect(screen.getByText(/3500 тг/)).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Мёд гречишный' })).toHaveAttribute('src', 'https://img.test/honey.jpg');
  });

  test('без картинки показывает заглушку', () => {
    render(<ProductCard product={{ ...product, image: null }} onAdd={() => {}} />);
    expect(screen.getByRole('img')).toHaveAttribute('src', expect.stringContaining('placehold.co'));
  });

  test('кнопка «В корзину» вызывает onAdd с товаром', async () => {
    const user = userEvent.setup();
    const onAdd = vi.fn();   // «шпион»: запоминает, как его вызвали
    render(<ProductCard product={product} onAdd={onAdd} />);

    await user.click(screen.getByRole('button', { name: /в корзину/i }));

    expect(onAdd).toHaveBeenCalledTimes(1);
    expect(onAdd).toHaveBeenCalledWith(product);
  });

  test('«Товар недели» — бейдж только у featured-карточки', () => {
    const { rerender } = render(<ProductCard product={product} onAdd={() => {}} featured />);
    expect(screen.getByText('Товар недели')).toBeInTheDocument();

    rerender(<ProductCard product={product} onAdd={() => {}} />);
    expect(screen.queryByText('Товар недели')).not.toBeInTheDocument();
  });
});
