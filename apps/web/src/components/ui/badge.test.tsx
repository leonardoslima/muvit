import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Badge, badgeDotVariants } from './badge';

describe('Badge', () => {
  it('aplica variantes no container e no ponto com CVA', () => {
    render(<Badge variant="paused">Pausado</Badge>);

    const badge = screen.getByText('Pausado');
    expect(badge).toHaveClass('bg-warning-bg', 'text-[#B87A0A]');
    expect(badge.querySelector('span')).toHaveClass('bg-warning');
  });

  it('exporta o helper de variantes do ponto para composicoes', () => {
    expect(badgeDotVariants({ variant: 'destructive' })).toContain('bg-destructive');
  });
});
