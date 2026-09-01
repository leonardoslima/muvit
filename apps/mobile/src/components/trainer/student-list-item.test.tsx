import { render, screen, userEvent } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { describe, expect, it, vi } from 'vitest';
import type { TrainerStudent } from '../../application/trainer/trainer-data';
import { colors } from '../../lib/styles';
import { StudentListItem } from './student-list-item';
import { StudentStatusBadge } from './student-status-badge';

function studentFixture(overrides: Partial<TrainerStudent> = {}): TrainerStudent {
  return {
    id: 'student-1',
    trainerId: 'trainer-1',
    isIndependent: false,
    name: 'Ana Júlia Souza',
    email: 'ana@example.com',
    phone: '27999999999',
    birthDate: null,
    gender: null,
    goals: null,
    restrictions: null,
    status: 'active',
    avatarUrl: null,
    expoPushToken: null,
    createdAt: '2026-08-31T12:00:00.000Z',
    ...overrides,
  };
}

describe('StudentListItem', () => {
  it('exibe nome, contato, status e abre o aluno', async () => {
    const user = userEvent.setup();
    const onPress = vi.fn();

    render(<StudentListItem onPress={onPress} student={studentFixture()} />);

    expect(screen.getByText('AJ')).toBeTruthy();
    expect(screen.getByText('Ana Júlia Souza')).toBeTruthy();
    expect(screen.getByText('ana@example.com')).toBeTruthy();
    expect(screen.getByText('Ativo')).toBeTruthy();

    await user.press(screen.getByRole('button', { name: 'Abrir Ana Júlia Souza' }));
    expect(onPress).toHaveBeenCalledOnce();
  });

  it.each([
    ['active', 'Ativo', colors.primarySoft, colors.primaryText, undefined],
    ['paused', 'Pausado', colors.warningSoft, colors.warningText, undefined],
    ['inactive', 'Inativo', colors.background, colors.muted, colors.line],
  ] as const)(
    'traduz status %s para %s com tokens semânticos',
    (status, label, backgroundColor, textColor, borderColor) => {
      render(<StudentListItem onPress={() => undefined} student={studentFixture({ status })} />);

      expect(screen.getByText(label)).toBeTruthy();
      const badgeStyle = StyleSheet.flatten(screen.getByTestId('student-status-badge').props.style);
      const textStyle = StyleSheet.flatten(screen.getByText(label).props.style);

      expect(badgeStyle).toMatchObject({ backgroundColor, borderColor });
      expect(textStyle).toMatchObject({ color: textColor });
    },
  );

  it('usa email antes do telefone e telefone quando email não existe', () => {
    render(<StudentListItem onPress={() => undefined} student={studentFixture({ email: null })} />);

    expect(screen.getByText('27999999999')).toBeTruthy();
    expect(screen.queryByText('ana@example.com')).toBeNull();
  });

  it('usa fallback quando o aluno não possui contato', () => {
    render(
      <StudentListItem
        onPress={() => undefined}
        student={studentFixture({ email: null, phone: null })}
      />,
    );

    expect(screen.getByText('Sem contato cadastrado')).toBeTruthy();
  });

  it('usa AL quando o nome não possui palavras', () => {
    render(<StudentListItem onPress={() => undefined} student={studentFixture({ name: '   ' })} />);

    expect(screen.getByText('AL')).toBeTruthy();
  });
});

describe('StudentStatusBadge', () => {
  it.each([
    ['active', 'Ativo'],
    ['paused', 'Pausado'],
    ['inactive', 'Inativo'],
  ] as const)('exibe a cópia acessível de %s', (status, label) => {
    render(<StudentStatusBadge status={status} />);

    expect(screen.getByText(label)).toBeTruthy();
  });
});
