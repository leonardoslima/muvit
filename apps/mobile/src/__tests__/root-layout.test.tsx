import { render, screen } from '@testing-library/react-native';
import React, { type ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RootLayout } from '../../app/_layout';
import { mobileRoutes } from '../application/navigation/role-navigation';

const routerState = vi.hoisted(() => ({
  segments: ['(student)', '(tabs)'] as string[],
  useSegments: vi.fn(),
}));

const fontState = vi.hoisted(() => ({
  loaded: true,
}));

const authState = vi.hoisted(() => ({
  session: {
    data: null as { user: { id: string; role: string } } | null,
    isPending: false,
  },
  useSession: vi.fn(),
}));

vi.mock('@tanstack/react-query', () => ({
  QueryClientProvider: ({ children }: { children: ReactNode }) =>
    React.createElement('View', { testID: 'query-client-provider' }, children),
}));

vi.mock('expo-font', () => ({
  useFonts: () => [fontState.loaded],
}));

vi.mock('@expo-google-fonts/inter', () => ({
  Inter_400Regular: 'Inter_400Regular',
  Inter_600SemiBold: 'Inter_600SemiBold',
}));

vi.mock('@expo-google-fonts/space-grotesk', () => ({
  SpaceGrotesk_600SemiBold: 'SpaceGrotesk_600SemiBold',
}));

vi.mock('expo-router', () => ({
  useSegments: routerState.useSegments,
  Redirect: ({ href }: { href: string }) => React.createElement('Text', null, `redirect:${href}`),
  Slot: () => React.createElement('Text', { testID: 'router-slot' }, 'slot'),
}));

vi.mock('expo-status-bar', () => ({
  StatusBar: () => null,
}));

vi.mock('sentry-expo', () => ({
  init: vi.fn(),
  Native: { wrap: (component: unknown) => component },
}));

vi.mock('../lib/auth-client', () => ({
  authClient: {
    useSession: authState.useSession,
  },
}));

vi.mock('../lib/query-client', () => ({
  queryClient: {},
}));

vi.mock('../components/navigation/unsupported-role-boundary', () => ({
  UnsupportedRoleBoundary: () => React.createElement('Text', null, 'Perfil não reconhecido'),
}));

vi.mock('../components/queue-drain', () => ({
  QueueDrain: () => React.createElement('Text', null, 'queue-drain'),
}));

vi.mock('../components/push-token-registration', () => ({
  PushTokenRegistration: () => React.createElement('Text', null, 'push-registration'),
}));

describe('RootLayout', () => {
  beforeEach(() => {
    routerState.useSegments.mockReset();
    routerState.useSegments.mockImplementation(() => routerState.segments);
    authState.useSession.mockReset();
    authState.useSession.mockImplementation(() => authState.session);
    routerState.segments = ['(student)', '(tabs)'];
    authState.session.data = null;
    authState.session.isPending = false;
    fontState.loaded = true;
  });

  it('aguarda as fontes antes de montar a árvore autenticada', () => {
    authState.session.data = { user: { id: 'auth-user-id', role: 'student' } };
    fontState.loaded = false;

    const { rerender } = render(<RootLayout />);

    expect(screen.getByLabelText('Carregando aplicativo')).toBeTruthy();
    expect(screen.queryByTestId('router-slot')).toBeNull();
    expect(routerState.useSegments).not.toHaveBeenCalled();
    expect(authState.useSession).not.toHaveBeenCalled();

    fontState.loaded = true;
    rerender(<RootLayout />);

    expect(screen.getByTestId('router-slot')).toBeTruthy();
    expect(routerState.useSegments).toHaveBeenCalledTimes(1);
    expect(authState.useSession).toHaveBeenCalledTimes(1);
  });

  it('mantém a tela de carregamento enquanto a sessão hidrata', () => {
    authState.session.isPending = true;

    render(<RootLayout />);

    expect(screen.getByLabelText('Carregando sessão')).toBeTruthy();
  });

  it('redireciona visitante para login', () => {
    render(<RootLayout />);

    expect(screen.getByText(`redirect:${mobileRoutes.login}`)).toBeTruthy();
  });

  it('encaminha trainer autenticado para o shell trainer', () => {
    authState.session.data = { user: { id: 'auth-user-id', role: 'trainer' } };
    routerState.segments = ['(auth)'];

    const { rerender } = render(<RootLayout />);

    expect(screen.getByText(`redirect:${mobileRoutes.trainerHome}`)).toBeTruthy();

    routerState.segments = ['(trainer)', 'trainer', 'students'];
    rerender(<RootLayout />);

    expect(screen.getByText('slot')).toBeTruthy();
  });

  it('protege deep links cruzados antes de montar o Slot', () => {
    authState.session.data = { user: { id: 'auth-user-id', role: 'student' } };
    routerState.segments = ['(trainer)', 'trainer', 'students'];

    const studentAttempt = render(<RootLayout />);

    expect(screen.getByText(`redirect:${mobileRoutes.studentHome}`)).toBeTruthy();
    expect(screen.queryByTestId('router-slot')).toBeNull();

    authState.session.data = { user: { id: 'auth-user-id', role: 'trainer' } };
    routerState.segments = ['(student)', '(tabs)'];

    studentAttempt.rerender(<RootLayout />);

    expect(screen.getByText(`redirect:${mobileRoutes.trainerHome}`)).toBeTruthy();
    expect(screen.queryByTestId('router-slot')).toBeNull();
  });

  it('mantém a infraestrutura global para trainer sem efeitos do aluno', () => {
    authState.session.data = { user: { id: 'auth-user-id', role: 'trainer' } };
    routerState.segments = ['(trainer)', 'trainer', 'students'];

    render(<RootLayout />);

    expect(screen.getByTestId('query-client-provider')).toBeTruthy();
    expect(screen.getByTestId('router-slot')).toBeTruthy();
    expect(screen.queryByText('queue-drain')).toBeNull();
    expect(screen.queryByText('push-registration')).toBeNull();
  });

  it('bloqueia role desconhecida sem montar Slot', () => {
    authState.session.data = { user: { id: 'auth-user-id', role: 'legacy' } };
    routerState.segments = ['(student)', '(tabs)'];

    render(<RootLayout />);

    expect(screen.getByText('Perfil não reconhecido')).toBeTruthy();
    expect(screen.queryByTestId('router-slot')).toBeNull();
  });
});
