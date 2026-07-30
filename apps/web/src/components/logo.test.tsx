import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Logo, logoVariants } from './logo';

describe('Logo', () => {
  it('aplica variantes de cor e tamanho com CVA', () => {
    render(<Logo variant="on-dark" size="lg" className="tracking-normal" />);

    expect(screen.getByText('MUVIT')).toHaveClass(
      'text-mkt-on-dark',
      'text-3xl',
      'tracking-normal',
    );
  });

  it('exporta o helper de variantes para composicoes', () => {
    expect(logoVariants({ variant: 'default', size: 'sm' })).toContain('text-primary');
    expect(logoVariants({ variant: 'default', size: 'sm' })).toContain('text-xl');
  });
});
