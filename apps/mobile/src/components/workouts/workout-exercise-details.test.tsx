import { render, screen } from '@testing-library/react-native';
import { describe, expect, it } from 'vitest';
import type { WorkoutDay } from '../../application/workouts/today-workout';
import { WorkoutExerciseDetails } from './workout-exercise-details';

const exercise: WorkoutDay['exercises'][number] = {
  id: 'workout-exercise-1',
  workoutDayId: 'day-1',
  exerciseId: 'exercise-1',
  exerciseOrder: 0,
  sets: 3,
  reps: '10 a 12',
  loadKg: 40,
  restSeconds: 60,
  tempo: null,
  notes: '  Controle a descida.  ',
  exercise: { id: 'exercise-1', name: 'Supino reto', muscleGroup: 'chest' },
};

describe('WorkoutExerciseDetails', () => {
  it('apresenta prescrição, descanso e observação sem espaços excedentes', () => {
    render(<WorkoutExerciseDetails exercise={exercise} />);

    expect(screen.getByText('Prescrição')).toBeTruthy();
    expect(screen.getByText('3 séries · 10 a 12 repetições')).toBeTruthy();
    expect(screen.getByText('Descanso: 60 s')).toBeTruthy();
    expect(screen.getByText('Observação')).toBeTruthy();
    expect(screen.getByText('Controle a descida.')).toBeTruthy();
  });

  it('omite uma observação vazia e mantém zero descanso', () => {
    render(<WorkoutExerciseDetails exercise={{ ...exercise, notes: '  ', restSeconds: 0 }} />);

    expect(screen.queryByText('Observação')).toBeNull();
    expect(screen.getByText('Descanso: 0 s')).toBeTruthy();
  });
});
