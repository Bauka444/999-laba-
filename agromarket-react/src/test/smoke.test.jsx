import { render, screen } from '@testing-library/react';

test('Testing Library работает', () => {
  render(<h1>АгроМаркет</h1>);
  expect(screen.getByRole('heading', { name: 'АгроМаркет' })).toBeInTheDocument();
});
