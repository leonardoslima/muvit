import { render, screen, userEvent } from '@testing-library/react-native';
import { describe, expect, it, vi } from 'vitest';
import type { TrainerWorkoutPlanSummary } from '../../application/workouts/trainer-workout-data';
import { WorkoutPlanListItem } from './workout-plan-list-item';
import { WorkoutStatusBadge } from './workout-status-badge';

const STUDENT_ID = '00000000-0000-0000-0000-000000000001';
const PLAN_ID = '00000000-0000-0000-0000-000000000301';

function planFixture(
  overrides: Partial<TrainerWorkoutPlanSummary> = {},
): TrainerWorkoutPlanSummary {
  return {
    id: PLAN_ID,
    studentId: STUDENT_ID,
    trainerId: '00000000-0000-0000-0000-000000000901',
    name: 'Hipertrofia',
    startDate: null,
    endDate: null,
    status: 'draft',
    createdAt: '2026-09-06T12:00:00.000Z',
    ...overrides,
  };
}

describe('WorkoutStatusBadge', () => {
  it.each([
    ['draft', 'Rascunho'],
    ['active', 'Ativo'],
    ['archived', 'Arquivado'],
  ] as const)('renderiza %s como %s', (status, label) => {
    render(<WorkoutStatusBadge status={status} />);

    expect(screen.getByText(label)).toBeTruthy();
  });
});

describe('WorkoutPlanListItem', () => {
  it('mostra status, período completo, data de criação e chama onPress', async () => {
    const onPress = vi.fn();
    const user = userEvent.setup();

    render(
      <WorkoutPlanListItem
        onPress={onPress}
        plan={planFixture({
          startDate: '2026-09-01',
          endDate: '2026-09-30',
        })}
      />,
    );

    expect(screen.getByText('Hipertrofia')).toBeTruthy();
    expect(screen.getByText('Rascunho')).toBeTruthy();
    expect(screen.getByText('01/09/2026 — 30/09/2026')).toBeTruthy();
    expect(screen.getByText('Criado em 06/09/2026')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Abrir Hipertrofia, Rascunho' })).toBeTruthy();

    await user.press(screen.getByRole('button', { name: 'Abrir Hipertrofia, Rascunho' }));

    expect(onPress).toHaveBeenCalledOnce();
  });

  it('mostra períodos parciais e não inventa período quando ausente', () => {
    const { rerender } = render(
      <WorkoutPlanListItem
        onPress={() => undefined}
        plan={planFixture({ startDate: '2026-09-01' })}
      />,
    );

    expect(screen.getByText('A partir de 01/09/2026')).toBeTruthy();

    rerender(
      <WorkoutPlanListItem
        onPress={() => undefined}
        plan={planFixture({ endDate: '2026-09-30' })}
      />,
    );

    expect(screen.getByText('Até 30/09/2026')).toBeTruthy();

    rerender(<WorkoutPlanListItem onPress={() => undefined} plan={planFixture()} />);

    expect(screen.queryByText(/A partir de|Até|—/)).toBeNull();
  });
});
