import { render, screen, userEvent } from '@testing-library/react-native';
import { describe, expect, it, vi } from 'vitest';
import type {
  TrainerWorkoutPlanDraft,
  TrainerWorkoutPlanSummary,
} from '../../application/workouts/trainer-workout-data';
import { WorkoutPlanListItem } from './workout-plan-list-item';
import { WorkoutStatusBadge } from './workout-status-badge';

const STUDENT_ID = '00000000-0000-0000-0000-000000000001';
const PLAN_ID = '00000000-0000-0000-0000-000000000301';
const DRAFT_ID = '00000000-0000-0000-0000-000000000501';

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

function draftFixture(overrides: Partial<TrainerWorkoutPlanDraft> = {}): TrainerWorkoutPlanDraft {
  return {
    id: DRAFT_ID,
    trainerId: '00000000-0000-0000-0000-000000000901',
    studentId: STUDENT_ID,
    sourcePlanId: null,
    payload: {
      name: 'Treino de criação',
      notes: '',
      days: [
        {
          label: 'Treino A',
          dayOrder: 0,
          exercises: [
            {
              exerciseId: '00000000-0000-0000-0000-000000000101',
              exerciseOrder: 0,
              sets: 3,
              reps: '10',
            },
          ],
        },
      ],
    },
    selectedDayOrder: 0,
    revision: 1,
    createdAt: '2026-10-15T12:00:00.000Z',
    updatedAt: '2026-10-15T12:00:00.000Z',
    exerciseReferences: [
      {
        id: '00000000-0000-0000-0000-000000000101',
        name: 'Supino reto',
        muscleGroup: 'chest',
      },
    ],
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

  it.each([
    [null, 'Nova prescrição'],
    [PLAN_ID, 'Alteração em rascunho'],
  ] as const)(
    'identifica e permite continuar rascunho de origem %s',
    async (sourcePlanId, label) => {
      const onPress = vi.fn();
      const user = userEvent.setup();
      const name = sourcePlanId ? 'Treino em edição' : 'Treino de criação';

      render(
        <WorkoutPlanListItem
          draft={draftFixture({
            sourcePlanId,
            payload: { ...draftFixture().payload, name },
          })}
          onPress={onPress}
        />,
      );

      const row = screen.getByRole('button', { name: `Continuar rascunho: ${name}` });
      expect(row).toBeTruthy();
      expect(screen.getByText(label)).toBeTruthy();
      expect(screen.getByText('Rascunho')).toBeTruthy();
      expect(screen.getByText('Atualizado em 15/10/2026')).toBeTruthy();

      await user.press(row);

      expect(onPress).toHaveBeenCalledOnce();
    },
  );
});
