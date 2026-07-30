import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BackToTopButton } from './back-to-top-button';

describe('BackToTopButton', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'scrollY', { configurable: true, value: 0, writable: true });
    window.scrollTo = vi.fn();
  });

  it('aparece somente depois que a pagina foi rolada', () => {
    render(<BackToTopButton />);

    expect(screen.queryByRole('button', { name: 'Voltar ao topo' })).not.toBeInTheDocument();

    window.scrollY = 401;
    fireEvent.scroll(window);

    expect(screen.getByRole('button', { name: 'Voltar ao topo' })).toBeInTheDocument();
  });

  it('retorna suavemente ao topo quando acionado', () => {
    window.scrollY = 401;
    render(<BackToTopButton />);
    fireEvent.scroll(window);

    fireEvent.click(screen.getByRole('button', { name: 'Voltar ao topo' }));

    expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' });
  });
});
