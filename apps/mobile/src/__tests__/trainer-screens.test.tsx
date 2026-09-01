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

vi.mock('react-native-safe-area-context', () => ({
  SafeAreaView: 'View',
}));

describe('superfícies trainer', () => {
  it('apresenta o perfil com contexto de treinador', () => {
    render(<TrainerProfileScreen />);

    expect(screen.getAllByText('Treinador')).toHaveLength(2);
    expect(screen.getByText('TR')).toBeTruthy();
    expect(screen.getByText('Acompanhe seus alunos no Muvit.')).toBeTruthy();
  });
});
