import { render, screen } from '@testing-library/react-native';
import React, { type ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RootLayout } from '../../app/_layout';

const routerState = vi.hoisted(() => ({
  segments: ['(tabs)'] as string[],
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
  QueryClientProvider: ({ children }: { children: ReactNode }) => children,
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
    routerState.segments = ['(tabs)'];
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

    expect(screen.getByText('redirect:/(auth)/login')).toBeTruthy();
  });

  it('redireciona aluno autenticado para as abas e monta serviços privados', () => {
    authState.session.data = { user: { id: 'auth-user-id', role: 'student' } };
    routerState.segments = ['(auth)'];

    const { rerender } = render(<RootLayout />);

    expect(screen.getByText('redirect:/(tabs)')).toBeTruthy();

    routerState.segments = ['(tabs)'];
    rerender(<RootLayout />);

    expect(screen.getByText('queue-drain')).toBeTruthy();
    expect(screen.getByText('push-registration')).toBeTruthy();
    expect(screen.getByText('slot')).toBeTruthy();
  });
});
