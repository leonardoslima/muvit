import { render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import PrintableReportLoading from './loading';

it('anuncia o carregamento da versão imprimível', () => {
  render(<PrintableReportLoading />);

  expect(screen.getByRole('status')).toHaveTextContent('Preparando versão para impressão');
});
