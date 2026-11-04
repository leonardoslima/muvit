import { render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import ReportsLayout from './layout';

it('compõe explicitamente a superfície autenticada com padding responsivo', () => {
  const { container } = render(
    <ReportsLayout>
      <p>Conteúdo do relatório</p>
    </ReportsLayout>,
  );

  expect(screen.getByText('Conteúdo do relatório')).toBeInTheDocument();
  expect(container.querySelector('[data-app-content="padded"]')).toBeInTheDocument();
});
