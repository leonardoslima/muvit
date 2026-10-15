import { render, screen, within } from '@testing-library/react-native';
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
  it('apresenta a hierarquia e a identidade do perfil de treinador', () => {
    render(<TrainerProfileScreen />);

    expect(screen.getByLabelText('Muvit')).toBeTruthy();
    expect(screen.getByRole('header', { name: 'Perfil' })).toBeTruthy();
    expect(screen.getByText('TR')).toBeTruthy();
    expect(screen.getAllByText('Treinador')).toHaveLength(2);
    expect(screen.getByText('Sem email cadastrado')).toBeTruthy();

    const profileHeading = screen.getByTestId('profile-heading');
    const accountSubtitle = screen.getByTestId('profile-subtitle');
    expect(within(profileHeading).getByTestId('profile-title')).toBeTruthy();
    expect(within(profileHeading).getByTestId('profile-subtitle')).toBeTruthy();
    expect(
      screen.getAllByTestId(/profile-(heading|card)/).map((section) => section.props.testID),
    ).toEqual(['profile-heading', 'profile-card']);
    expect(screen.getByText('Informações da sua conta.')).toBe(accountSubtitle);
    expect(screen.getByRole('button', { name: 'Sair' })).toBeTruthy();
    expect(screen.queryByText('Acompanhe seus alunos no Muvit.')).toBeNull();
  });
});
