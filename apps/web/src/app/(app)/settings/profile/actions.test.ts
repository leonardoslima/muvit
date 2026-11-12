import { updateTrainerProfile } from '@/lib/api/sdk.gen';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { updateProfileAction } from './actions';

const cookieSet = vi.fn();

vi.mock('@/lib/api-client', () => ({ configureServerClient: vi.fn().mockResolvedValue({}) }));
vi.mock('@/lib/api/sdk.gen', () => ({ updateTrainerProfile: vi.fn() }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('next/headers', () => ({ cookies: vi.fn(async () => ({ set: cookieSet })) }));

const formData = () => {
  const data = new FormData();
  data.set('name', 'João Pereira');
  data.set('email', 'novo@example.com');
  data.set('phone', '');
  data.set('bio', '');
  data.set('specialties', 'Hipertrofia');
  data.set('avatarUrl', '');
  return data;
};

describe('updateProfileAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('propaga todos os cookies renovados e retorna sucesso após atualizar o perfil', async () => {
    const response = new Response();
    Object.defineProperty(response.headers, 'getSetCookie', {
      value: () => [
        'better-auth.session_token=novo; Path=/; HttpOnly; SameSite=Lax',
        'better-auth.session_data=dados; Path=/; Max-Age=3600; Secure',
      ],
    });
    vi.mocked(updateTrainerProfile).mockResolvedValue({
      data: {
        id: 'trainer-1',
        name: 'João Pereira',
        email: 'novo@example.com',
        phone: null,
        bio: null,
        specialties: ['Hipertrofia'],
        avatarUrl: null,
        plan: 'pro',
        onboardedAt: null,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
      error: undefined,
      request: new Request('https://api.test'),
      response,
    });

    await expect(updateProfileAction(null, formData())).resolves.toEqual({ success: true });
    expect(cookieSet).toHaveBeenCalledTimes(2);
    expect(cookieSet).toHaveBeenCalledWith(
      'better-auth.session_token',
      'novo',
      expect.objectContaining({ httpOnly: true, path: '/' }),
    );
    expect(cookieSet).toHaveBeenCalledWith(
      'better-auth.session_data',
      'dados',
      expect.objectContaining({ maxAge: 3600, secure: true }),
    );
  });

  it('traduz conflito estruturado sem expor erro remoto', async () => {
    vi.mocked(updateTrainerProfile).mockResolvedValue({
      data: undefined,
      error: { error: 'detalhe interno' },
      request: new Request('https://api.test'),
      response: new Response(null, { status: 409 }),
    });

    await expect(updateProfileAction(null, formData())).resolves.toEqual({
      fieldErrors: {
        email: 'Esse e-mail não está disponível. Atualize a página e tente outro e-mail.',
      },
    });
  });

  it('informa quando a troca de email ainda depende de confirmação', async () => {
    vi.mocked(updateTrainerProfile).mockResolvedValue({
      data: {
        id: 'trainer-1',
        name: 'João',
        email: 'antigo@example.com',
        phone: null,
        bio: null,
        specialties: [],
        avatarUrl: null,
        plan: 'free',
        onboardedAt: null,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
      error: undefined,
      request: new Request('https://api.test'),
      response: new Response(),
    });
    await expect(updateProfileAction(null, formData())).resolves.toEqual({
      success: true,
      emailVerificationPending: true,
      effectiveEmail: 'antigo@example.com',
    });
  });

  it('encaminha cookies reais muvit com atributos completos e valor contendo =', async () => {
    const response = new Response();
    const expires = new Date('2026-10-21T07:28:00.000Z');
    Object.defineProperty(response.headers, 'getSetCookie', {
      value: () => [
        'muvit.session_token=YWJj.ZGVm==; Path=/; HttpOnly; Secure; SameSite=Lax; Expires=Wed, 21 Oct 2026 07:28:00 GMT; Max-Age=2592000',
        'muvit.session_data=YWJj.ZGVm==; Path=/; HttpOnly; SameSite=Strict; Max-Age=0',
      ],
    });
    vi.mocked(updateTrainerProfile).mockResolvedValue({
      data: {
        id: 'trainer-1',
        name: 'João Pereira',
        email: 'novo@example.com',
        phone: null,
        bio: null,
        specialties: ['Hipertrofia'],
        avatarUrl: null,
        plan: 'pro',
        onboardedAt: null,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
      error: undefined,
      request: new Request('https://api.test'),
      response,
    });

    await expect(updateProfileAction(null, formData())).resolves.toEqual({ success: true });
    expect(cookieSet).toHaveBeenCalledTimes(2);
    expect(cookieSet).toHaveBeenNthCalledWith(1, 'muvit.session_token', 'YWJj.ZGVm==', {
      path: '/',
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      expires,
      maxAge: 2592000,
    });
    expect(cookieSet).toHaveBeenNthCalledWith(2, 'muvit.session_data', 'YWJj.ZGVm==', {
      path: '/',
      httpOnly: true,
      sameSite: 'strict',
      maxAge: 0,
    });
  });

  it('desfaz a codificação do cookie Better Auth antes de gravar no Next', async () => {
    const response = new Response();
    Object.defineProperty(response.headers, 'getSetCookie', {
      value: () => [
        'muvit.session_token=YWJj.ZGVm%2BZ2hp%3D; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000',
      ],
    });
    vi.mocked(updateTrainerProfile).mockResolvedValue({
      data: {
        id: 'trainer-1',
        name: 'João Pereira',
        email: 'novo@example.com',
        phone: null,
        bio: null,
        specialties: ['Hipertrofia'],
        avatarUrl: null,
        plan: 'pro',
        onboardedAt: null,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
      error: undefined,
      request: new Request('https://api.test'),
      response,
    });

    await expect(updateProfileAction(null, formData())).resolves.toEqual({ success: true });
    expect(cookieSet).toHaveBeenCalledWith(
      'muvit.session_token',
      'YWJj.ZGVm+Z2hp=',
      expect.objectContaining({ httpOnly: true, path: '/', maxAge: 2592000 }),
    );
  });

  it('propaga cookies renovados quando a atualização retorna conflito', async () => {
    const response = new Response(null, { status: 409 });
    Object.defineProperty(response.headers, 'getSetCookie', {
      value: () => [
        'better-auth.session_token=restaurado; Path=/; HttpOnly; SameSite=Strict',
        'better-auth.session_data=compensado; Path=/; Max-Age=120; Secure',
      ],
    });
    vi.mocked(updateTrainerProfile).mockResolvedValue({
      data: undefined,
      error: { error: 'conflito de identidade' },
      request: new Request('https://api.test'),
      response,
    });

    await expect(updateProfileAction(null, formData())).resolves.toEqual({
      fieldErrors: {
        email: 'Esse e-mail não está disponível. Atualize a página e tente outro e-mail.',
      },
    });
    expect(cookieSet).toHaveBeenCalledTimes(2);
    expect(cookieSet).toHaveBeenCalledWith(
      'better-auth.session_token',
      'restaurado',
      expect.objectContaining({ httpOnly: true, sameSite: 'strict' }),
    );
    expect(cookieSet).toHaveBeenCalledWith(
      'better-auth.session_data',
      'compensado',
      expect.objectContaining({ maxAge: 120, secure: true }),
    );
  });
});
