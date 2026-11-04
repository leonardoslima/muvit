import { getTrainerProfile } from '@/lib/api/sdk.gen';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ProfilePage from './page';

vi.mock('@/lib/api-client', () => ({ configureServerClient: vi.fn().mockResolvedValue({}) }));
vi.mock('@/lib/api/sdk.gen', () => ({ getTrainerProfile: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

function apiOk() {
  return {
    data: {
      id: 'trainer-1',
      name: 'João Pereira',
      email: 'joao@example.com',
      phone: '(11) 99999-0000',
      bio: 'Personal trainer',
      specialties: ['Hipertrofia', 'Reabilitação'],
      avatarUrl: 'https://cdn.example.com/avatar.jpg',
      plan: 'pro' as const,
      onboardedAt: '2026-01-01T00:00:00.000Z',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
    error: undefined,
    request: new Request('https://api.test'),
    response: new Response(null, { status: 200 }),
  };
}

describe('ProfilePage', () => {
  beforeEach(() => {
    vi.mocked(getTrainerProfile).mockResolvedValue(apiOk());
  });

  it('carrega e apresenta os campos editáveis do perfil', async () => {
    render(await ProfilePage());

    expect(getTrainerProfile).toHaveBeenCalledWith({ client: {} });
    expect(screen.getByRole('heading', { name: 'Meu perfil' })).toBeInTheDocument();
    expect(screen.getByLabelText('Nome')).toHaveValue('João Pereira');
    expect(screen.getByLabelText('E-mail')).toHaveValue('joao@example.com');
    expect(screen.getByLabelText('Especialidades')).toHaveValue('Hipertrofia, Reabilitação');
    expect(screen.getByRole('button', { name: 'Salvar alterações' })).toBeInTheDocument();
  });

  it('mantém uma mensagem clara quando o perfil não pode ser carregado', async () => {
    vi.mocked(getTrainerProfile).mockResolvedValue({
      ...apiOk(),
      data: undefined,
      error: { error: 'Falha' },
    });

    render(await ProfilePage());

    expect(screen.getByRole('alert')).toHaveTextContent('Não foi possível carregar seu perfil.');
  });
});
