import { render, screen } from '@testing-library/react-native';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import TrainerHomeScreen from '../../app/(trainer)/trainer/index';
import TrainerProfileScreen from '../../app/(trainer)/trainer/profile';
import TrainerStudentsScreen from '../../app/(trainer)/trainer/students';

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
  it('apresenta a entrada do shell trainer sem dados de domínio', () => {
    render(<TrainerHomeScreen />);

    expect(screen.getByText('Início')).toBeTruthy();
    expect(screen.getByText('Acompanhe seus alunos por aqui.')).toBeTruthy();
    expect(screen.getByText('Visão geral')).toBeTruthy();
  });

  it('apresenta a superfície de alunos sem antecipar o domínio', () => {
    render(<TrainerStudentsScreen />);

    expect(screen.getByText('Alunos')).toBeTruthy();
    expect(screen.getByText('Consulte seus alunos por aqui.')).toBeTruthy();
    expect(screen.getByText('Alunos vinculados')).toBeTruthy();
  });

  it('apresenta o perfil com contexto de treinador', () => {
    render(<TrainerProfileScreen />);

    expect(screen.getAllByText('Treinador')).toHaveLength(2);
    expect(screen.getByText('TR')).toBeTruthy();
    expect(screen.getByText('Acompanhe seus alunos no Muvit.')).toBeTruthy();
  });
});
