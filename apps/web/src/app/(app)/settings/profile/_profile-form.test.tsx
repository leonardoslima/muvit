import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ProfileForm } from './_profile-form';
import { updateProfileAction } from './actions';

const refresh = vi.fn();

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }));
vi.mock('./actions', () => ({ updateProfileAction: vi.fn() }));

const profile = {
  id: 'trainer-1',
  name: 'João Pereira',
  email: 'joao@example.com',
  phone: null,
  bio: null,
  specialties: ['Hipertrofia'],
  avatarUrl: null,
  plan: 'pro' as const,
  onboardedAt: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('ProfileForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(updateProfileAction).mockReset();
  });

  it('preserva valores digitados e associa o erro de e-mail ao campo', async () => {
    vi.mocked(updateProfileAction).mockResolvedValue({
      fieldErrors: { email: 'Esse e-mail não está disponível.' },
    });
    render(<ProfileForm profile={profile} />);

    fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: 'novo@example.com' } });
    const form = screen.getByRole('button', { name: 'Salvar alterações' }).closest('form');
    if (!form) throw new Error('Formulário de perfil não encontrado.');
    fireEvent.submit(form);

    expect(await screen.findByText('Esse e-mail não está disponível.')).toBeInTheDocument();
    expect(screen.getByLabelText('E-mail')).toHaveValue('novo@example.com');
    expect(screen.getByLabelText('E-mail')).toHaveAttribute('aria-describedby', 'email-error');
  });

  it('bloqueia novo submit enquanto salva', async () => {
    let resolveAction:
      | ((state: Awaited<ReturnType<typeof updateProfileAction>>) => void)
      | undefined;
    vi.mocked(updateProfileAction).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveAction = resolve;
        }),
    );
    render(<ProfileForm profile={profile} />);

    fireEvent.click(screen.getByRole('button', { name: 'Salvar alterações' }));
    const pendingButton = await screen.findByRole('button', { name: 'Salvando…' });
    fireEvent.click(pendingButton);

    expect(pendingButton).toBeDisabled();
    await waitFor(() => expect(updateProfileAction).toHaveBeenCalledOnce());
    await act(async () => resolveAction?.({ success: true }));
    await waitFor(() => expect(refresh).toHaveBeenCalledOnce());
  });

  it('atualiza a prévia controlada e refresca o shell depois do sucesso', async () => {
    vi.mocked(updateProfileAction).mockResolvedValue({ success: true });
    render(<ProfileForm profile={profile} />);

    const avatar = screen.getByLabelText('Avatar de João Pereira');
    expect(avatar.querySelector('img')).toBeNull();
    fireEvent.change(screen.getByLabelText('URL do avatar'), {
      target: { value: 'https://cdn.muvit.test/joao.png' },
    });
    expect(avatar.querySelector('img')).toHaveAttribute('src', 'https://cdn.muvit.test/joao.png');

    const form = screen.getByRole('button', { name: 'Salvar alterações' }).closest('form');
    if (!form) throw new Error('Formulário de perfil não encontrado.');
    fireEvent.submit(form);

    await waitFor(() => expect(refresh).toHaveBeenCalledOnce());
  });
});
