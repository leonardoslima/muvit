import { getStudents } from '@/lib/api/sdk.gen';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import StudentsPage from './page';

vi.mock('@/components/top-bar', () => ({
  TopBar: ({ title, subtitle }: { title: string; subtitle?: string }) => (
    <header>
      <h1>{title}</h1>
      {subtitle && <p>{subtitle}</p>}
    </header>
  ),
}));
vi.mock('@/lib/api-client', () => ({ configureServerClient: vi.fn().mockResolvedValue({}) }));
vi.mock('@/lib/api/sdk.gen', () => ({ getStudents: vi.fn() }));
vi.mock('./_search', () => ({ StudentSearch: () => <div /> }));

function apiOk<T>(data: T) {
  return {
    data,
    error: undefined,
    request: new Request('https://api.test'),
    response: new Response(null, { status: 200 }),
  };
}

function apiError() {
  return {
    data: undefined,
    error: { message: 'Falha' },
    request: new Request('https://api.test'),
    response: new Response(null, { status: 503 }),
  };
}

function student(overrides: Record<string, unknown> = {}) {
  return {
    id: 'student-1',
    trainerId: 'trainer-1',
    isIndependent: false,
    name: 'Ana Lima',
    email: 'ana@example.com',
    phone: null,
    birthDate: null,
    gender: 'female' as const,
    goals: null,
    trainingDays: null,
    restrictions: null,
    status: 'active' as const,
    avatarUrl: null,
    expoPushToken: null,
    createdAt: '2026-06-20T00:00:00.000Z',
    ...overrides,
  };
}

async function renderPage(
  searchParams: { q?: string; status?: 'active' | 'inactive' | 'paused' } = {},
) {
  return render(await StudentsPage({ searchParams: Promise.resolve(searchParams) }));
}

describe('StudentsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('mostra erro recuperável e preserva q/status na carteira, sem inventar vazio', async () => {
    vi.mocked(getStudents).mockResolvedValue(apiError());

    const { container } = render(
      await StudentsPage({
        searchParams: Promise.resolve({ q: 'Ana Lima & cia', status: 'active' }),
      }),
    );

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Não foi possível carregar a lista de alunos.');
    expect(alert).toHaveTextContent('Tente novamente em alguns instantes.');

    const retry = screen.getByRole('link', { name: 'Tentar novamente' });
    const retryUrl = new URL(retry.getAttribute('href') ?? '', 'http://localhost');
    expect(retryUrl.pathname).toBe('/students');
    expect(retryUrl.searchParams.get('q')).toBe('Ana Lima & cia');
    expect(retryUrl.searchParams.get('status')).toBe('active');

    expect(screen.queryByText('0 alunos cadastrados')).not.toBeInTheDocument();
    expect(screen.queryByText('Nenhum aluno cadastrado ainda.')).not.toBeInTheDocument();
    expect(screen.queryByText('Nenhum aluno encontrado para esta busca.')).not.toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: 'Cadastrar primeiro aluno' }),
    ).not.toBeInTheDocument();
    expect(container.querySelector('ul')).not.toBeInTheDocument();
  });

  it('mantém a carteira genuinamente vazia com o CTA de primeiro cadastro', async () => {
    vi.mocked(getStudents).mockResolvedValue(apiOk({ items: [], total: 0 }));

    await renderPage();

    expect(await screen.findByText('0 alunos cadastrados')).toBeInTheDocument();
    expect(screen.getByText('Nenhum aluno cadastrado ainda.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Cadastrar primeiro aluno' })).toHaveAttribute(
      'href',
      '/students/new',
    );
  });

  it('mantém a busca sem resultados sem CTA de primeiro cadastro', async () => {
    vi.mocked(getStudents).mockResolvedValue(apiOk({ items: [], total: 0 }));

    await renderPage({ q: 'ninguém' });

    expect(await screen.findByText('Nenhum aluno encontrado para esta busca.')).toBeInTheDocument();
    expect(screen.queryByText('Nenhum aluno cadastrado ainda.')).not.toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: 'Cadastrar primeiro aluno' }),
    ).not.toBeInTheDocument();
  });

  it('mostra registro e contagem reais quando há aluno', async () => {
    vi.mocked(getStudents).mockResolvedValue(apiOk({ items: [student()], total: 1 }));

    await renderPage();

    expect(await screen.findByText('1 aluno cadastrado')).toBeInTheDocument();
    expect(screen.getByText('Ana Lima')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Abrir' })).toHaveAttribute(
      'href',
      '/students/student-1',
    );
    expect(screen.queryByText('Nenhum aluno cadastrado ainda.')).not.toBeInTheDocument();
  });

  it('recupera do erro para dados reais em nova renderização', async () => {
    vi.mocked(getStudents).mockResolvedValue(apiError());
    const first = await renderPage();
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Não foi possível carregar a lista de alunos.',
    );
    first.unmount();

    vi.mocked(getStudents).mockResolvedValue(apiOk({ items: [student()], total: 1 }));
    await renderPage();

    expect(await screen.findByText('Ana Lima')).toBeInTheDocument();
    expect(screen.getByText('1 aluno cadastrado')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('recupera do erro para carteira realmente vazia sem confundir com criação', async () => {
    vi.mocked(getStudents).mockResolvedValue(apiError());
    const first = await renderPage();
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    first.unmount();

    vi.mocked(getStudents).mockResolvedValue(apiOk({ items: [], total: 0 }));
    await renderPage();

    expect(await screen.findByText('Nenhum aluno cadastrado ainda.')).toBeInTheDocument();
    expect(screen.getByText('0 alunos cadastrados')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
