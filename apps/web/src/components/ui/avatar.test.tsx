import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Avatar, avatarVariants } from './avatar';

describe('Avatar', () => {
  it('aplica variantes de tamanho com CVA', () => {
    render(<Avatar name="Maria Silva" size="lg" />);

    expect(screen.getByText('MS')).toHaveClass('h-12', 'w-12', 'text-base');
  });

  it('exporta o helper de variantes para composicoes', () => {
    expect(avatarVariants({ size: 'sm' })).toContain('h-8');
    expect(avatarVariants({ size: 'sm' })).toContain('text-xs');
  });
});
