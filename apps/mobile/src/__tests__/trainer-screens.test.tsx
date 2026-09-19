import { render, screen } from '@testing-library/react-native';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import TrainerProfileScreen from '../../app/(trainer)/trainer/profile';

const authState = vi.hoisted(() => ({
  session: {
    data: null,
    isPending: false,
  },
}));

vi.mock('../lib/auth-client', () => ({
  authClient: {
    signOut: vi.fn(),
    useSession: () => authState.session,
  },
}));

vi.mock('../lib/query-client', () => ({
  queryClient: {
    clear: vi.fn(),
  },
}));

vi.mock('expo-router', () => ({
  router: {
    replace: vi.fn(),
  },
}));

vi.mock('@expo/vector-icons', () => ({
  Ionicons: (props: Record<string, unknown>) => React.createElement('Ionicons', props),
}));

vi.mock('react-native-safe-area-context', () => ({
  SafeAreaView: 'View',
}));

describe('superfícies trainer', () => {
  it('apresenta o perfil com contexto de treinador', () => {
    render(<TrainerProfileScreen />);

    expect(screen.getAllByText('Treinador')).toHaveLength(3);
    expect(screen.getByText('TR')).toBeTruthy();
    expect(screen.getByText('Sua conta e visão de treinador.')).toBeTruthy();
    expect(screen.getByText('Tipo de conta')).toBeTruthy();
    expect(screen.getByText('Acesso')).toBeTruthy();
    expect(screen.getByText('Alunos e treinos')).toBeTruthy();
  });
});
