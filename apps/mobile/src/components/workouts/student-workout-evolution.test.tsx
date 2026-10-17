import { render, screen, userEvent } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { WorkoutEvolution } from '../../application/workouts/workout-evolution';
import { StudentWorkoutEvolution } from './student-workout-evolution';

const evolutionState = vi.hoisted(() => ({
  data: undefined as WorkoutEvolution | undefined,
  isPending: false,
  isError: false,
  isFetching: false,
  refetch: vi.fn(),
}));
const navigationState = vi.hoisted(() => ({ hrefs: [] as string[] }));

vi.mock('../../lib/use-workout-evolution', () => ({ useWorkoutEvolution: () => evolutionState }));
vi.mock('expo-router', () => ({
  Link: ({ href, children }: { href: string; children: ReactNode }) => {
    navigationState.hrefs.push(href);
    return children;
  },
}));

describe('StudentWorkoutEvolution', () => {
  beforeEach(() => {
    evolutionState.data = undefined;
    evolutionState.isPending = false;
    evolutionState.isError = false;
    evolutionState.isFetching = false;
    evolutionState.refetch.mockReset();
    navigationState.hrefs = [];
  });

  it('mostra as métricas reais e oferece acesso ao histórico existente', () => {
    evolutionState.data = { streakWeeks: 3, completedThisWeek: 2, weeklyGoal: null };
    render(<StudentWorkoutEvolution />);
    expect(screen.getByText('03')).toBeTruthy();
    expect(screen.getByText('02')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Ver histórico de evolução' })).toBeTruthy();
    expect(navigationState.hrefs).toContain('/progress');
    expect(screen.queryByText('de 04 treinos')).toBeNull();
  });

  it('apresenta a meta semanal explícita sem limitar a quantidade de treinos concluídos', () => {
    evolutionState.data = { streakWeeks: 3, completedThisWeek: 5, weeklyGoal: 4 };
    render(<StudentWorkoutEvolution />);
    expect(screen.getByText('05')).toBeTruthy();
    expect(screen.getByText('de 04 treinos')).toBeTruthy();
  });

  it('não apresenta ausência de dados como zero durante o carregamento', () => {
    evolutionState.isPending = true;
    render(<StudentWorkoutEvolution />);
    expect(screen.getAllByText('—')).toHaveLength(2);
    expect(screen.queryByText('00')).toBeNull();
  });

  it('preserva os dados anteriores e permite atualizar depois de uma falha', async () => {
    evolutionState.data = { streakWeeks: 3, completedThisWeek: 2, weeklyGoal: null };
    evolutionState.isError = true;
    render(<StudentWorkoutEvolution />);
    expect(screen.getByText('03')).toBeTruthy();
    expect(screen.getByText('02')).toBeTruthy();
    await userEvent.setup().press(screen.getByRole('button', { name: 'Atualizar evolução' }));
    expect(evolutionState.refetch).toHaveBeenCalledOnce();
  });
});
