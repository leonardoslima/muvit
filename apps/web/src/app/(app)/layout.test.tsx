import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import AppLayout from './layout';

vi.mock('@/lib/auth-server', () => ({
  requireUser: vi.fn().mockResolvedValue({
    name: 'Professor Demo',
    email: 'trainer@muvit.dev',
    image: 'https://cdn.muvit.test/professor.png',
  }),
}));

vi.mock('next/navigation', () => ({
  usePathname: () => '/dashboard',
  useRouter: () => ({ refresh: vi.fn(), replace: vi.fn() }),
}));

vi.mock('@/lib/auth-client', () => ({
  authClient: { signOut: vi.fn() },
}));

describe('AppLayout', () => {
  it('impede rolagem externa quando o shell autenticado usa rolagem interna', async () => {
    const { container } = render(await AppLayout({ children: <div>Conteúdo</div> }));
    const styles = readFileSync(resolve(process.cwd(), 'src/app/globals.css'), 'utf8');

    expect(container.querySelector('[data-app-shell]')).toBeInTheDocument();
    expect(container.querySelector('[data-app-content]')).not.toBeInTheDocument();
    expect(styles).toContain('body:has(> [data-app-shell])');
    expect(styles).toContain('overflow: hidden;');
  });

  it('oferece navegação desktop e compacta para o mesmo usuário', async () => {
    render(await AppLayout({ children: <div>Conteúdo</div> }));

    expect(screen.getByRole('navigation', { name: 'Navegação principal' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Abrir menu principal' })).toBeInTheDocument();
    expect(screen.getByText('Professor Demo')).toBeInTheDocument();
    expect(screen.getByLabelText('Perfil de Professor Demo')).toBeInTheDocument();
    const avatars = [
      screen.getByRole('img', { name: 'Perfil de Professor Demo' }),
      screen.getByRole('img', { name: 'Avatar de Professor Demo' }),
    ];
    for (const avatar of avatars) {
      expect(avatar.querySelector('img')).toHaveAttribute(
        'src',
        'https://cdn.muvit.test/professor.png',
      );
    }
  });
});
