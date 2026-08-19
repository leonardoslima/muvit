import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import { PrintButton } from './print-button';

it('abre o diálogo do navegador somente após a ação explícita do usuário', () => {
  let printed = false;
  const originalPrint = window.print;
  window.print = () => {
    printed = true;
  };

  render(<PrintButton />);

  expect(printed).toBe(false);
  fireEvent.click(screen.getByRole('button', { name: 'Imprimir ou salvar em PDF' }));
  expect(printed).toBe(true);

  window.print = originalPrint;
});
