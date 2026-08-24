import { fireEvent, render, screen } from '@testing-library/react';
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

  it('renderiza uma origem HTTP segura e volta às iniciais quando a imagem falha', () => {
    render(<Avatar name="Maria Silva" src="https://cdn.muvit.test/maria.png" />);

    const avatar = screen.getByRole('img', { name: 'Avatar de Maria Silva' });
    const image = avatar.querySelector('img');
    expect(image).toHaveAttribute('src', 'https://cdn.muvit.test/maria.png');
    if (!image) throw new Error('Imagem segura do avatar não foi renderizada.');

    fireEvent.error(image);

    expect(avatar.querySelector('img')).toBeNull();
    expect(screen.getByText('MS')).toBeInTheDocument();
  });

  it('ignora origens inseguras e mantém o fallback de iniciais', () => {
    render(<Avatar name="Maria Silva" src="javascript:alert('xss')" />);

    const avatar = screen.getByRole('img', { name: 'Avatar de Maria Silva' });
    expect(avatar.querySelector('img')).toBeNull();
    expect(screen.getByText('MS')).toBeInTheDocument();
  });
});
