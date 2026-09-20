import { render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { describe, expect, it } from 'vitest';
import type { TrainerWorkoutPlan } from '../../application/workouts/trainer-workout-data';
import { WorkoutDayCard } from './workout-day-card';

const PLAN_ID = '00000000-0000-0000-0000-000000000301';
const DAY_ID = '00000000-0000-0000-0000-000000000201';

function dayFixture(): TrainerWorkoutPlan['days'][number] {
  return {
    id: DAY_ID,
    planId: PLAN_ID,
    label: 'Treino A',
    dayOrder: 0,
    exercises: [
      {
        id: '00000000-0000-0000-0000-000000000401',
        workoutDayId: DAY_ID,
        exerciseId: '00000000-0000-0000-0000-000000000101',
        exerciseOrder: 0,
        sets: 4,
        reps: '8-10',
        restSeconds: 90,
        loadKg: '82.50',
        tempo: '3010',
        notes: 'Sem falhar',
        exercise: {
          id: '00000000-0000-0000-0000-000000000101',
          name: 'Supino reto',
          muscleGroup: 'chest',
        },
      },
      {
        id: '00000000-0000-0000-0000-000000000402',
        workoutDayId: DAY_ID,
        exerciseId: '00000000-0000-0000-0000-000000000102',
        exerciseOrder: 1,
        sets: 3,
        reps: '10',
        restSeconds: null,
        loadKg: null,
        tempo: null,
        notes: null,
        exercise: {
          id: '00000000-0000-0000-0000-000000000102',
          name: 'Crucifixo',
          muscleGroup: 'chest',
        },
      },
    ],
  };
}

describe('WorkoutDayCard', () => {
  it('mostra a contagem de exercícios no cabeçalho do dia', () => {
    render(<WorkoutDayCard day={dayFixture()} />);

    expect(screen.getByText('Treino A')).toBeTruthy();
    expect(screen.getByText('2 exercícios')).toBeTruthy();
    expect(screen.getByText('2 exercícios').props.style).toMatchObject({
      color: '#3498DB',
    });
    expect(StyleSheet.flatten(screen.getByTestId('workout-day-section').props.style)).toMatchObject(
      {
        gap: 8,
      },
    );
    expect(
      StyleSheet.flatten(
        screen.getByTestId('workout-day-exercise-00000000-0000-0000-0000-000000000401').props.style,
      ),
    ).toMatchObject({
      borderRadius: 10,
      gap: 5,
      paddingHorizontal: 12,
      paddingVertical: 10,
    });
    expect(
      screen.getByTestId('workout-day-exercise-00000000-0000-0000-0000-000000000401'),
    ).toBeTruthy();
    expect(
      screen.getByTestId('workout-day-exercise-00000000-0000-0000-0000-000000000402'),
    ).toBeTruthy();
    expect(screen.getByText('Supino reto')).toBeTruthy();
    expect(StyleSheet.flatten(screen.getByText('Supino reto').props.style)).toMatchObject({
      fontSize: 14,
      lineHeight: 18,
    });
    expect(screen.getByText('Crucifixo')).toBeTruthy();
    expect(screen.getByText('4 séries • 8-10 repetições • 82,5 kg')).toBeTruthy();
    expect(screen.getByText('3 séries • 10 repetições')).toBeTruthy();
    expect(screen.getByText('Descanso: 90 s')).toBeTruthy();
    expect(screen.getByText('Notas: Sem falhar')).toBeTruthy();
    expect(
      StyleSheet.flatten(screen.getByText('4 séries • 8-10 repetições • 82,5 kg').props.style),
    ).toMatchObject({ lineHeight: 13 });
    expect(screen.queryByText('Peito')).toBeNull();
    expect(screen.queryByText('3010')).toBeNull();
  });
});
