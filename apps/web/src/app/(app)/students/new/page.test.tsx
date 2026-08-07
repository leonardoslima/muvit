import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import NewStudentPage from './page';

describe('NewStudentPage', () => {
  it('abre o cadastro guiado dentro da área autenticada e permite fechá-lo', () => {
    render(<NewStudentPage />);

    expect(screen.getByRole('link', { name: 'Fechar cadastro' })).toHaveAttribute(
      'href',
      '/students',
    );
    expect(screen.getByRole('navigation', { name: 'Progresso do cadastro' })).toHaveTextContent(
      'Etapa 1 de 3',
    );
  });
});
