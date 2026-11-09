import { getStudentsById, getStudentsByStudentIdAssessments } from '@/lib/api/sdk.gen';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AssessmentsListPage from './page';

vi.mock('@/lib/api-client', () => ({ configureServerClient: vi.fn().mockResolvedValue({}) }));
vi.mock('@/lib/api/sdk.gen', () => ({
  getStudentsById: vi.fn(),
  getStudentsByStudentIdAssessments: vi.fn(),
}));
vi.mock('next/navigation', () => ({ notFound: vi.fn() }));

function apiOk<T>(data: T) {
  return {
    data,
    error: undefined,
    request: new Request('https://api.test'),
    response: new Response(),
  };
}

const student = {
  id: 'student-1',
  trainerId: 'trainer-1',
  isIndependent: false,
  name: 'Maria Costa',
  email: 'maria@example.com',
  phone: null,
  birthDate: null,
  gender: 'female' as const,
  goals: null,
  trainingDays: null,
  restrictions: null,
  status: 'active' as const,
  avatarUrl: null,
  expoPushToken: null,
  createdAt: '2026-01-01T12:00:00.000Z',
};
const assessment = {
  id: 'assessment-1',
  dateAssessmentCount: 1,
  studentId: 'student-1',
  date: '2026-03-15',
  weightKg: 62.5,
  heightCm: 167,
  bodyFatPct: 18,
  measurements: null,
  photos: null,
  notes: null,
  createdAt: '2026-03-15T12:00:00.000Z',
};

describe('AssessmentsListPage', () => {
  const ambiguityWarning =
    'Há mais de uma avaliação nesta data. A ordem das medições não foi informada.';

  beforeEach(() => {
    vi.mocked(getStudentsById).mockResolvedValue(apiOk(student));
  });

  it('preserva detalhes empatados sem selecionar medição atual', async () => {
    vi.mocked(getStudentsByStudentIdAssessments).mockResolvedValue(
      apiOk({
        items: [
          {
            ...assessment,
            dateAssessmentCount: 2,
            notes: 'Primeiro registro',
            measurements: { waist: 80 },
          },
          {
            ...assessment,
            id: 'assessment-2',
            dateAssessmentCount: 2,
            weightKg: 70,
            notes: 'Segundo registro',
            measurements: { waist: 90 },
          },
        ],
        total: 2,
      }),
    );
    const { container } = render(
      await AssessmentsListPage({ params: Promise.resolve({ id: student.id }) }),
    );
    expect(screen.getAllByText(ambiguityWarning)).toHaveLength(1);
    expect(screen.queryByText('Mais recente')).not.toBeInTheDocument();
    expect(screen.queryByText('Data mais recente')).not.toBeInTheDocument();
    expect(screen.queryByText(/Atual:/)).not.toBeInTheDocument();
    expect(screen.getAllByRole('listitem')[0]).not.toHaveClass('bg-primary/5');
    expect(screen.getByRole('heading', { name: 'Avaliações de 15/03/2026' })).toBeInTheDocument();
    expect(container).not.toHaveTextContent('assessment-1');
    expect(container).not.toHaveTextContent('assessment-2');
    expect(screen.getByText('Primeiro registro')).toBeInTheDocument();
    expect(screen.getByText('Segundo registro')).toBeInTheDocument();
    expect(screen.getByText('2 registros nesta data.')).toBeInTheDocument();
    const comparison = screen.getByRole('table', { name: 'Comparação de avaliações' });
    for (const value of ['80 cm', '90 cm']) {
      expect(screen.getAllByText(value)).toHaveLength(2);
      expect(within(comparison).getByText(value)).toBeInTheDocument();
      expect(screen.getByText(value, { selector: 'dd' })).toBeInTheDocument();
    }
  });
  it('informa quantos registros do grupo mais recente não foram carregados e mantém os detalhes', async () => {
    const tiedAssessments = Array.from({ length: 100 }, (_, index) => ({
      ...assessment,
      id: `assessment-${index + 1}`,
      dateAssessmentCount: 101,
      weightKg: 60 + index,
    }));
    vi.mocked(getStudentsByStudentIdAssessments).mockResolvedValue(
      apiOk({ items: tiedAssessments, total: 101 }),
    );
    render(await AssessmentsListPage({ params: Promise.resolve({ id: student.id }) }));

    expect(
      screen.getByText('Exibindo 100 de 101 registros nesta data. 1 registro não foi carregado.'),
    ).toBeInTheDocument();
    expect(screen.queryByText('100 registros nesta data.')).not.toBeInTheDocument();
    expect(screen.getAllByRole('heading', { name: /^Registro com / })).toHaveLength(100);
    expect(screen.getByRole('heading', { name: 'Registro com 60 kg' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Registro com 159 kg' })).toBeInTheDocument();
  });
  it('usa plural correto quando mais de um registro do grupo recente não foi carregado', async () => {
    const tiedAssessments = [0, 1].map((index) => ({
      ...assessment,
      id: `assessment-${index + 1}`,
      dateAssessmentCount: 5,
      weightKg: 70 + index,
    }));
    vi.mocked(getStudentsByStudentIdAssessments).mockResolvedValue(
      apiOk({ items: tiedAssessments, total: 5 }),
    );
    render(await AssessmentsListPage({ params: Promise.resolve({ id: student.id }) }));

    expect(
      screen.getByText('Exibindo 2 de 5 registros nesta data. 3 registros não foram carregados.'),
    ).toBeInTheDocument();
  });
  it('permite consultar os detalhes de cada empate antigo após uma data única recente', async () => {
    vi.mocked(getStudentsByStudentIdAssessments).mockResolvedValue(
      apiOk({
        items: [
          { ...assessment, id: 'recent', date: '2026-03-16', notes: 'Registro recente' },
          {
            ...assessment,
            dateAssessmentCount: 2,
            weightKg: 78.5,
            notes: 'Registro Web',
            measurements: { hip: 91 },
            photos: ['https://cdn.test/web.jpg'],
          },
          {
            ...assessment,
            id: 'assessment-2',
            dateAssessmentCount: 2,
            weightKg: 80,
            notes: 'Registro via HTTP',
            measurements: { hip: 95 },
            photos: ['https://cdn.test/http.jpg'],
          },
        ],
        total: 3,
      }),
    );
    const { container } = render(
      await AssessmentsListPage({ params: Promise.resolve({ id: student.id }) }),
    );
    expect(screen.getAllByText(ambiguityWarning)).toHaveLength(1);
    expect(screen.getAllByText('Registro recente')).toHaveLength(1);
    expect(screen.getByRole('heading', { name: 'Medidas mais recentes' })).toBeVisible();
    expect(screen.queryByText(/Atual:|Variação:|Tendência/)).not.toBeInTheDocument();
    expect(
      screen.queryByRole('img', { name: 'Gráfico de evolução de Peso' }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole('table', { name: 'Dados de evolução de Peso' })).toBeInTheDocument();
    const disclosures = container.querySelectorAll('details');
    expect(disclosures).toHaveLength(2);
    const expectedDisclosures = [
      {
        summary: screen.getByText('Detalhes de 15/03/2026 — 78,5 kg'),
        note: 'Registro Web',
        measurement: '91 cm',
        photo: 'https://cdn.test/web.jpg',
      },
      {
        summary: screen.getByText('Detalhes de 15/03/2026 — 80 kg'),
        note: 'Registro via HTTP',
        measurement: '95 cm',
        photo: 'https://cdn.test/http.jpg',
      },
    ];
    for (const expected of expectedDisclosures) {
      const disclosure = expected.summary.closest('details');
      expect(disclosure).toBeInstanceOf(HTMLElement);
      if (!(disclosure instanceof HTMLElement)) throw new Error('Detalhes não encontrados');
      expect(disclosure).not.toHaveAttribute('open');
      fireEvent.click(expected.summary);
      expect(disclosure).toHaveAttribute('open');
      expect(within(disclosure).getByText(expected.note)).toBeVisible();
      expect(within(disclosure).getByText(expected.measurement)).toBeVisible();
      expect(within(disclosure).getByRole('img')).toHaveAttribute('src', expected.photo);
      expect(within(disclosure).queryByText(/mais recentes/)).not.toBeInTheDocument();
    }
    expect(container).not.toHaveTextContent('assessment-1');
    expect(container).not.toHaveTextContent('assessment-2');
  });

  it('mostra um estado de erro sem transformar falha em histórico vazio', async () => {
    vi.mocked(getStudentsByStudentIdAssessments).mockResolvedValue({
      data: undefined,
      error: { message: 'network' },
      request: new Request('https://api.test'),
      response: new Response(null, { status: 500 }),
    });

    render(await AssessmentsListPage({ params: Promise.resolve({ id: 'student-1' }) }));

    expect(screen.getByRole('alert')).toHaveTextContent('Não foi possível carregar as avaliações.');
    expect(screen.getByRole('link', { name: 'Tentar novamente' })).toHaveAttribute(
      'href',
      '/students/student-1/assessments',
    );
    expect(screen.queryByText('Nenhuma avaliação registrada ainda.')).not.toBeInTheDocument();
  });

  it('oferece registrar a primeira avaliação no estado vazio', async () => {
    vi.mocked(getStudentsByStudentIdAssessments).mockResolvedValue(apiOk({ items: [], total: 0 }));

    render(await AssessmentsListPage({ params: Promise.resolve({ id: 'student-1' }) }));

    expect(screen.getByText('Nenhuma avaliação registrada ainda.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Registrar primeira avaliação' })).toHaveAttribute(
      'href',
      '/students/student-1/assessments/new',
    );
  });

  it('exibe a avaliação única sem inventar comparação, medidas ou fotos', async () => {
    vi.mocked(getStudentsByStudentIdAssessments).mockResolvedValue(
      apiOk({ items: [assessment], total: 1 }),
    );

    render(await AssessmentsListPage({ params: Promise.resolve({ id: 'student-1' }) }));

    expect(screen.getByText('Dados insuficientes para comparar avaliações.')).toBeInTheDocument();
    expect(screen.getByText('Nenhuma medida de circunferência registrada.')).toBeInTheDocument();
    expect(screen.getByText('Nenhuma foto de progresso registrada.')).toBeInTheDocument();
    expect(
      screen.queryByRole('table', { name: 'Comparação de avaliações' }),
    ).not.toBeInTheDocument();
  });

  it('compara os últimos registros e mantém a estrutura responsiva', async () => {
    const latest = {
      ...assessment,
      id: 'assessment-2',
      date: '2026-05-15',
      weightKg: 60,
      bodyFatPct: 16,
      measurements: { waist: 74, armRight: 32 },
      photos: ['https://cdn.test/front.jpg'],
    };
    vi.mocked(getStudentsByStudentIdAssessments).mockResolvedValue(
      apiOk({ items: [latest, assessment], total: 2 }),
    );

    const { container } = render(
      await AssessmentsListPage({ params: Promise.resolve({ id: 'student-1' }) }),
    );

    expect(screen.getByRole('table', { name: 'Comparação de avaliações' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Peso ao longo do tempo' })).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Gordura corporal ao longo do tempo' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Gráfico de evolução de Peso' })).toBeInTheDocument();
    expect(
      screen.getByRole('img', { name: 'Gráfico de evolução de Gordura corporal' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Atual: 60 kg')).toBeInTheDocument();
    expect(screen.getByText('Variação: −2,5 kg')).toBeInTheDocument();
    const [highlightedAssessment] = screen.getAllByRole('listitem');
    expect(highlightedAssessment).toBeDefined();
    if (!highlightedAssessment) throw new Error('Avaliação mais recente não encontrada');
    expect(highlightedAssessment).toHaveClass('bg-primary/5');
    expect(within(highlightedAssessment).getByText('Mais recente')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Foto de progresso de 15/05/2026' })).toHaveAttribute(
      'src',
      'https://cdn.test/front.jpg',
    );
    expect(container.querySelector('[data-responsive-layout="assessment-history"]')).toHaveClass(
      'flex',
      'flex-col',
    );
    expect(container.querySelector('[class~="xl:grid-cols-[260px_minmax(0,1fr)]"]')).toBeTruthy();
    expect(container.querySelector('[class~="lg:grid-cols-2"]')).toBeTruthy();
  });

  it('não desenha série de gordura quando apenas o peso foi medido', async () => {
    vi.mocked(getStudentsByStudentIdAssessments).mockResolvedValue(
      apiOk({
        items: [
          { ...assessment, id: 'assessment-2', date: '2026-05-15', weightKg: 60, bodyFatPct: null },
          { ...assessment, bodyFatPct: null },
        ],
        total: 2,
      }),
    );

    render(await AssessmentsListPage({ params: Promise.resolve({ id: 'student-1' }) }));

    expect(screen.getByRole('img', { name: 'Gráfico de evolução de Peso' })).toBeInTheDocument();
    expect(screen.getByText('Sem dados de gordura corporal registrados.')).toBeInTheDocument();
    expect(
      screen.queryByRole('img', { name: 'Gráfico de evolução de Gordura corporal' }),
    ).not.toBeInTheDocument();
  });
});
