import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import NewStudentPage from './page';

describe('NewStudentPage', () => {
  it('abre o cadastro guiado full-screen e permite fechá-lo', () => {
    const { container } = render(<NewStudentPage />);

    expect(screen.getByRole('link', { name: 'Fechar' })).toHaveAttribute('href', '/students');
    expect(screen.getByRole('navigation', { name: 'Progresso do cadastro' })).toHaveTextContent(
      'Etapa 1 de 3',
    );
    expect(container.firstElementChild).toHaveClass('min-h-dvh');
  });
});
