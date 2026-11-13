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

type SearchParams = { q?: string; status?: 'active' | 'inactive' | 'paused'; page?: string };

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

function student(index = 1, overrides: Record<string, unknown> = {}) {
  return {
    id: `student-${index}`,
    trainerId: 'trainer-1',
    isIndependent: false,
    name: `Aluno ${String(index).padStart(3, '0')}`,
    email: `aluno-${index}@example.com`,
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

function createStudents(count: number) {
  return Array.from({ length: count }, (_, index) => student(index + 1));
}

function mockPage(items: Array<ReturnType<typeof student>>, total: number) {
  vi.mocked(getStudents).mockResolvedValueOnce(apiOk({ items, total }));
}

function mockPortfolioTotal(total: number) {
  vi.mocked(getStudents).mockResolvedValueOnce(apiOk({ items: [], total }));
}

async function renderPage(searchParams: SearchParams = {}) {
  return render(await StudentsPage({ searchParams: Promise.resolve(searchParams) }));
}

describe('StudentsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('mostra erro recuperável e preserva q/status/page na carteira', async () => {
    vi.mocked(getStudents).mockResolvedValue(apiError());

    const { container } = render(
      await StudentsPage({
        searchParams: Promise.resolve({ q: 'Ana Lima & cia', status: 'active', page: '2' }),
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
    expect(retryUrl.searchParams.get('page')).toBe('2');

    expect(screen.queryByText(/alunos cadastrados/)).not.toBeInTheDocument();
    expect(screen.queryByText('Nenhum aluno cadastrado ainda.')).not.toBeInTheDocument();
    expect(
      screen.queryByText('Nenhum aluno encontrado para os filtros aplicados.'),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: 'Cadastrar primeiro aluno' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('navigation', { name: 'Paginação de alunos' }),
    ).not.toBeInTheDocument();
    expect(container.querySelector('ul')).not.toBeInTheDocument();
  });

  it('mantém a carteira genuinamente vazia com o CTA de primeiro cadastro', async () => {
    mockPage([], 0);

    await renderPage();

    expect(await screen.findByText('0 alunos cadastrados')).toBeInTheDocument();
    expect(screen.getByText('Nenhum aluno cadastrado ainda.')).toBeInTheDocument();
    expect(screen.getByText('Mostrando 0 de 0 alunos')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Anterior' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Próxima' })).toBeDisabled();
    expect(screen.getByRole('link', { name: 'Cadastrar primeiro aluno' })).toHaveAttribute(
      'href',
      '/students/new',
    );
  });

  it('distingue busca sem resultados do total global e não oferece primeiro cadastro', async () => {
    mockPage([], 0);
    mockPortfolioTotal(52);

    await renderPage({ q: 'ninguém' });

    expect(
      await screen.findByText('Nenhum aluno encontrado para os filtros aplicados.'),
    ).toBeInTheDocument();
    expect(screen.getByText('52 alunos cadastrados')).toBeInTheDocument();
    expect(screen.getByText('0 alunos encontrados')).toBeInTheDocument();
    expect(screen.queryByText('Nenhum aluno cadastrado ainda.')).not.toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: 'Cadastrar primeiro aluno' }),
    ).not.toBeInTheDocument();
    expect(screen.getByText('Mostrando 0 de 0 alunos')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Próxima' })).toBeDisabled();
  });

  it('mostra registro e contagem reais quando há aluno', async () => {
    mockPage([student()], 1);

    await renderPage();

    expect(await screen.findByText('1 aluno cadastrado')).toBeInTheDocument();
    expect(screen.getByText('Aluno 001')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Abrir' })).toHaveAttribute(
      'href',
      '/students/student-1',
    );
    expect(screen.getByText('Mostrando 1–1 de 1 alunos')).toBeInTheDocument();
    expect(screen.getByText('Página 1 de 1')).toBeInTheDocument();
    expect(screen.queryByText('Nenhum aluno cadastrado ainda.')).not.toBeInTheDocument();
  });

  it('separa total global de resultados filtrados', async () => {
    mockPage([student(1), student(2)], 2);
    mockPortfolioTotal(52);

    await renderPage({ q: 'Aluno' });

    expect(await screen.findByText('52 alunos cadastrados')).toBeInTheDocument();
    expect(screen.getByText('2 alunos encontrados')).toBeInTheDocument();
    expect(screen.getByText('Mostrando 1–2 de 2 alunos')).toBeInTheDocument();
    expect(screen.queryByText('2 alunos cadastrados')).not.toBeInTheDocument();
  });

  it('usa singular na contagem filtrada e mantém o total global', async () => {
    mockPage([student(52, { name: 'Carteira 052' })], 1);
    mockPortfolioTotal(52);

    await renderPage({ q: 'Carteira 052', status: 'paused' });

    expect(await screen.findByText('52 alunos cadastrados')).toBeInTheDocument();
    expect(screen.getByText('1 aluno encontrado')).toBeInTheDocument();
    expect(screen.getByText('Mostrando 1–1 de 1 alunos')).toBeInTheDocument();
    expect(screen.queryByText('1 aluno cadastrado')).not.toBeInTheDocument();
  });

  it('pagina 1 de 52 mostra 50 itens e link para a página 2', async () => {
    mockPage(createStudents(50), 52);

    await renderPage();

    expect(await screen.findByText('Mostrando 1–50 de 52 alunos')).toBeInTheDocument();
    expect(screen.getByText('Página 1 de 2')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Anterior' })).toBeDisabled();
    expect(screen.getByRole('link', { name: 'Próxima' })).toHaveAttribute(
      'href',
      '/students?page=2',
    );
  });

  it('pagina 2 preserva busca e status nos links de navegação', async () => {
    mockPage([student(51), student(52)], 52);
    mockPortfolioTotal(52);

    await renderPage({ q: 'Carteira', status: 'paused', page: '2' });

    expect(await screen.findByText('Mostrando 51–52 de 52 alunos')).toBeInTheDocument();
    expect(screen.getByText('Página 2 de 2')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Próxima' })).toBeDisabled();

    const previous = screen.getByRole('link', { name: 'Anterior' });
    const previousUrl = new URL(previous.getAttribute('href') ?? '', 'http://localhost');
    expect(previousUrl.pathname).toBe('/students');
    expect(previousUrl.searchParams.get('q')).toBe('Carteira');
    expect(previousUrl.searchParams.get('status')).toBe('paused');
    expect(previousUrl.searchParams.get('page')).toBeNull();
  });

  it.each([
    [50, 'Página 1 de 1', false],
    [51, 'Página 1 de 2', true],
  ])('trata fronteira de %s alunos', async (total, pageLabel, hasNext) => {
    mockPage(createStudents(Math.min(total, 50)), total);

    await renderPage();

    expect(await screen.findByText(pageLabel)).toBeInTheDocument();
    if (hasNext) {
      expect(screen.getByRole('link', { name: 'Próxima' })).toHaveAttribute(
        'href',
        '/students?page=2',
      );
    } else {
      expect(screen.getByRole('button', { name: 'Próxima' })).toBeDisabled();
    }
  });

  it('usa a página efetiva após limitar página fora do intervalo', async () => {
    mockPage([], 52);
    mockPage([student(51), student(52)], 52);

    await renderPage({ page: '999' });

    expect(await screen.findByText('Página 2 de 2')).toBeInTheDocument();
    expect(screen.getByText('Mostrando 51–52 de 52 alunos')).toBeInTheDocument();
    expect(vi.mocked(getStudents)).toHaveBeenCalledTimes(2);
  });

  it('recupera do erro para dados reais em nova renderização', async () => {
    vi.mocked(getStudents).mockResolvedValue(apiError());
    const first = await renderPage();
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Não foi possível carregar a lista de alunos.',
    );
    first.unmount();

    mockPage([student()], 1);
    await renderPage();

    expect(await screen.findByText('Aluno 001')).toBeInTheDocument();
    expect(screen.getByText('1 aluno cadastrado')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('recupera do erro para carteira realmente vazia sem confundir com criação', async () => {
    vi.mocked(getStudents).mockResolvedValue(apiError());
    const first = await renderPage();
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    first.unmount();

    mockPage([], 0);
    await renderPage();

    expect(await screen.findByText('Nenhum aluno cadastrado ainda.')).toBeInTheDocument();
    expect(screen.getByText('0 alunos cadastrados')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
