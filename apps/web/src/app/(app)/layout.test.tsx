import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import AppLayout from './layout';

vi.mock('@/components/sidebar', () => ({
  Sidebar: () => <aside />,
}));

vi.mock('@/lib/auth-server', () => ({
  requireUser: vi.fn().mockResolvedValue({ name: 'Professor Demo', email: 'trainer@muvit.dev' }),
}));

describe('AppLayout', () => {
  it('impede rolagem externa quando o shell autenticado usa rolagem interna', async () => {
    const { container } = render(await AppLayout({ children: <div>Conteúdo</div> }));
    const styles = readFileSync(resolve(process.cwd(), 'src/app/globals.css'), 'utf8');

    expect(container.querySelector('[data-app-shell]')).toBeInTheDocument();
    expect(styles).toContain('body:has(> [data-app-shell])');
    expect(styles).toContain('overflow: hidden;');
  });
});
