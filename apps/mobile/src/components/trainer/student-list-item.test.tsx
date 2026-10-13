import { render, screen, userEvent } from '@testing-library/react-native';
import { describe, expect, it, vi } from 'vitest';
import type { TrainerStudent } from '../../application/trainer/trainer-data';
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
    ['active', 'Ativo', 'bg-v2-successBg', 'text-v2-success'],
    ['paused', 'Pausado', 'bg-v2-warningBg', 'text-v2-warning'],
    ['inactive', 'Inativo', 'bg-v2-infoBg', 'text-v2-info'],
  ] as const)(
    'traduz status %s para %s com a variante v2 correspondente',
    (status, label, backgroundClass, textClass) => {
      render(<StudentListItem onPress={() => undefined} student={studentFixture({ status })} />);

      expect(screen.getByText(label)).toBeTruthy();
      const badgeClassName = screen.getByTestId('student-status-badge').props.className;
      const textClassName = screen.getByText(label).props.className;

      expect(badgeClassName).toContain(backgroundClass);
      expect(textClassName).toContain(textClass);
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

  it('mantém nome e contato longos sem truncamento em uma única linha tocável', () => {
    const name = 'Ana Júlia de Souza Campos com sobrenome extenso';
    const email = 'ana.julia.souza.campos@example.com';
    const student = studentFixture({
      name,
      email,
      status: 'paused',
    });

    render(<StudentListItem onPress={() => undefined} student={student} />);

    expect(screen.getByText(name).props.numberOfLines).toBeUndefined();
    expect(screen.getByText(email).props.numberOfLines).toBeUndefined();
    expect(screen.getByText('Pausado')).toBeTruthy();
    expect(screen.getAllByRole('button')).toHaveLength(1);
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

  it('mantém texto e identidade acessível no modo compacto', () => {
    render(<StudentStatusBadge compact status="inactive" />);

    expect(screen.getByText('Inativo')).toBeTruthy();
    expect(screen.getByLabelText('Inativo')).toBeTruthy();
    expect(screen.getByTestId('student-status-badge').props.className).toContain('min-h-[24px]');
  });
});
