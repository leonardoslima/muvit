import { render, screen } from '@testing-library/react-native';
import React, { type ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RootLayout } from './_layout';

const routerState = vi.hoisted(() => ({
  segments: ['(tabs)'] as string[],
}));

const authState = vi.hoisted(() => ({
  session: {
    data: null as { user: { id: string; role: string } } | null,
    isPending: false,
  },
}));

vi.mock('@tanstack/react-query', () => ({
  QueryClientProvider: ({ children }: { children: ReactNode }) => children,
}));

vi.mock('expo-router', () => ({
  useSegments: () => routerState.segments,
  Redirect: ({ href }: { href: string }) => React.createElement('Text', null, `redirect:${href}`),
  Slot: () => React.createElement('Text', null, 'slot'),
}));

vi.mock('expo-status-bar', () => ({
  StatusBar: () => null,
}));

vi.mock('sentry-expo', () => ({
  init: vi.fn(),
  Native: { wrap: (component: unknown) => component },
}));

vi.mock('../src/lib/auth-client', () => ({
  authClient: {
    useSession: () => authState.session,
  },
}));

vi.mock('../src/lib/query-client', () => ({
  queryClient: {},
}));

vi.mock('../src/components/queue-drain', () => ({
  QueueDrain: () => React.createElement('Text', null, 'queue-drain'),
}));

vi.mock('../src/components/push-token-registration', () => ({
  PushTokenRegistration: () => React.createElement('Text', null, 'push-registration'),
}));

describe('RootLayout', () => {
  beforeEach(() => {
    routerState.segments = ['(tabs)'];
    authState.session.data = null;
    authState.session.isPending = false;
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
