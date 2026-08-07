import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AppContentSurface } from './app-content-surface';

describe('AppContentSurface', () => {
  it('mantém espaçamento responsivo nas rotas de conteúdo', () => {
    render(<AppContentSurface>Dashboard</AppContentSurface>);

    const surface = screen.getByText('Dashboard');
    expect(surface).toHaveAttribute('data-app-content', 'padded');
    expect(surface).toHaveClass('gap-7', 'px-4', 'py-6', 'lg:px-10', 'lg:py-8');
  });

  it('oferece superfície full-height sem padding nem gap implícitos', () => {
    render(<AppContentSurface variant="fullHeight">Construtor</AppContentSurface>);

    const surface = screen.getByText('Construtor');
    expect(surface).toHaveAttribute('data-app-content', 'full-height');
    expect(surface).toHaveClass('min-h-full');
    expect(surface).not.toHaveClass('gap-7', 'px-4', 'py-6', 'lg:px-10', 'lg:py-8');
  });
});
