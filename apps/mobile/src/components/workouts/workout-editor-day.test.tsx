import { fireEvent, render, screen, userEvent } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { describe, expect, it, vi } from 'vitest';
import type {
  WorkoutEditorDay,
  WorkoutEditorExercise,
} from '../../application/workouts/workout-editor';
import { WorkoutEditorDayView } from './workout-editor-day';

const EXERCISE_ID = '00000000-0000-0000-0000-000000000101';

function exerciseFixture(overrides: Partial<WorkoutEditorExercise> = {}): WorkoutEditorExercise {
  return {
    localId: 'exercise-1',
    exerciseId: EXERCISE_ID,
    exerciseName: 'Supino reto',
    muscleGroup: 'chest',
    sets: '3',
    reps: '10',
    loadKg: '',
    restSeconds: '',
    notes: '',
    tempo: '3010',
    ...overrides,
  };
}

function dayFixture(exercises: WorkoutEditorExercise[] = [exerciseFixture()]): WorkoutEditorDay {
  return { localId: 'day-1', label: 'Treino A', exercises };
}

function renderDay(props: Partial<React.ComponentProps<typeof WorkoutEditorDayView>> = {}) {
  const callbacks = {
    onAddExercise: vi.fn(),
    onChangeExercise: vi.fn(),
    onChangeLabel: vi.fn(),
    onFocusExercise: vi.fn(),
    onMoveExercise: vi.fn(),
    onRemoveDay: vi.fn(),
    onRemoveExercise: vi.fn(),
  };

  const view = render(<WorkoutEditorDayView day={dayFixture()} {...callbacks} {...props} />);

  return { ...view, callbacks };
}

describe('WorkoutEditorDayView', () => {
  it('renderiza o dia, campos do exercício e omite tempo', () => {
    renderDay();

    expect(screen.getByLabelText('Nome do dia').props.value).toBe('Treino A');
    expect(screen.getByText('Supino reto')).toBeTruthy();
    expect(screen.getByText('Peito')).toBeTruthy();
    expect(screen.getByLabelText('Séries').props.value).toBe('3');
    expect(screen.getByLabelText('Repetições').props.value).toBe('10');
    expect(screen.getByLabelText('Carga')).toBeTruthy();
    expect(screen.getByLabelText('Descanso')).toBeTruthy();
    expect(screen.getByLabelText('Observação')).toBeTruthy();
    expect(screen.queryByText('3010')).toBeNull();
    expect(screen.getByLabelText('Carga').props.keyboardType).toBe('number-pad');
    expect(screen.getByLabelText('Séries').props.keyboardType).toBe('numeric');
    expect(screen.getByLabelText('Repetições').props.keyboardType).toBe('default');
    expect(screen.getByLabelText('Descanso').props.keyboardType).toBe('numeric');
  });

  it('mostra o estado vazio e adiciona exercício', async () => {
    const user = userEvent.setup();
    const { callbacks } = renderDay({ day: dayFixture([]) });

    expect(screen.getByText('Nenhum exercício neste dia')).toBeTruthy();
    await user.press(screen.getByRole('button', { name: 'Adicionar exercício' }));

    expect(callbacks.onAddExercise).toHaveBeenCalledOnce();
  });

  it('emite alterações com o localId do dia e do exercício', () => {
    const { callbacks } = renderDay();

    fireEvent.changeText(screen.getByLabelText('Nome do dia'), 'Força');
    fireEvent.changeText(screen.getByLabelText('Séries'), '4');
    fireEvent.changeText(screen.getByLabelText('Repetições'), '8-10');
    fireEvent.changeText(screen.getByLabelText('Carga'), '80,5');
    fireEvent.changeText(screen.getByLabelText('Descanso'), '90');
    fireEvent.changeText(screen.getByLabelText('Observação'), 'Controlar a descida');

    expect(callbacks.onChangeLabel).toHaveBeenCalledWith('Força');
    expect(callbacks.onChangeExercise).toHaveBeenNthCalledWith(1, 'exercise-1', 'sets', '4');
    expect(callbacks.onChangeExercise).toHaveBeenNthCalledWith(2, 'exercise-1', 'reps', '8-10');
    expect(callbacks.onChangeExercise).toHaveBeenNthCalledWith(3, 'exercise-1', 'loadKg', '80,5');
    expect(callbacks.onChangeExercise).toHaveBeenNthCalledWith(
      4,
      'exercise-1',
      'restSeconds',
      '90',
    );
    expect(callbacks.onChangeExercise).toHaveBeenNthCalledWith(
      5,
      'exercise-1',
      'notes',
      'Controlar a descida',
    );
  });

  it('controla reordenação nas bordas e remoção', async () => {
    const user = userEvent.setup();
    const second = exerciseFixture({ localId: 'exercise-2', exerciseName: 'Remada baixa' });
    const { callbacks } = renderDay({ day: dayFixture([exerciseFixture(), second]) });

    expect(
      screen.getByRole('button', { name: 'Mover Supino reto para cima' }).props.accessibilityState,
    ).toEqual(expect.objectContaining({ disabled: true }));
    expect(
      screen.getByRole('button', { name: 'Mover Remada baixa para baixo' }).props
        .accessibilityState,
    ).toEqual(expect.objectContaining({ disabled: true }));

    await user.press(screen.getByRole('button', { name: 'Mover Remada baixa para cima' }));
    await user.press(screen.getByRole('button', { name: 'Mover Supino reto para baixo' }));
    await user.press(screen.getByRole('button', { name: 'Remover Supino reto' }));

    expect(callbacks.onMoveExercise).toHaveBeenNthCalledWith(1, 'exercise-2', -1);
    expect(callbacks.onMoveExercise).toHaveBeenNthCalledWith(2, 'exercise-1', 1);
    expect(callbacks.onRemoveExercise).toHaveBeenCalledWith('exercise-1');
  });

  it('bloqueia todos os controles quando desabilitado', () => {
    renderDay({ disabled: true });

    expect(screen.getByLabelText('Nome do dia').props.editable).toBe(false);
    for (const label of [
      'Adicionar exercício',
      'Mover Supino reto para cima',
      'Mover Supino reto para baixo',
      'Remover Supino reto',
    ]) {
      expect(screen.getByRole('button', { name: label }).props.accessibilityState).toEqual(
        expect.objectContaining({ disabled: true }),
      );
    }
  });

  it('foca exercício pelo lápis e mostra o estado de foco', async () => {
    const user = userEvent.setup();
    const { callbacks } = renderDay();

    await user.press(screen.getByRole('button', { name: 'Editar exercício Supino reto' }));

    expect(callbacks.onFocusExercise).toHaveBeenCalledWith('exercise-1');
    expect(screen.getByText('Editando exercício')).toBeTruthy();
  });

  it('prioriza alteração não salva sobre foco e oculta o indicador ao restaurar o baseline', () => {
    const { rerender } = render(
      <WorkoutEditorDayView
        canRemoveDay={false}
        day={dayFixture()}
        dirtyExerciseIds={['exercise-1']}
        focusedExerciseId="exercise-1"
        onAddExercise={vi.fn()}
        onChangeExercise={vi.fn()}
        onChangeLabel={vi.fn()}
        onFocusExercise={vi.fn()}
        onMoveExercise={vi.fn()}
        onRemoveDay={vi.fn()}
        onRemoveExercise={vi.fn()}
      />,
    );

    expect(screen.getByText('Alterações não salvas')).toBeTruthy();
    expect(screen.queryByText('Editando exercício')).toBeNull();

    rerender(
      <WorkoutEditorDayView
        canRemoveDay={false}
        day={dayFixture()}
        dirtyExerciseIds={[]}
        focusedExerciseId="exercise-1"
        onAddExercise={vi.fn()}
        onChangeExercise={vi.fn()}
        onChangeLabel={vi.fn()}
        onFocusExercise={vi.fn()}
        onMoveExercise={vi.fn()}
        onRemoveDay={vi.fn()}
        onRemoveExercise={vi.fn()}
      />,
    );

    expect(screen.getByText('Editando exercício')).toBeTruthy();
    expect(screen.queryByText('Alterações não salvas')).toBeNull();
  });

  it('remove dia vazio diretamente sem pedir confirmação', async () => {
    const user = userEvent.setup();
    const alert = vi.spyOn(Alert, 'alert');
    const { callbacks } = renderDay({ day: dayFixture([]), canRemoveDay: true });

    await user.press(screen.getByRole('button', { name: 'Remover Treino A' }));

    expect(callbacks.onRemoveDay).toHaveBeenCalledOnce();
    expect(alert).not.toHaveBeenCalled();
  });

  it('pede confirmação nativa para remover dia preenchido e impede remover o último dia', async () => {
    const user = userEvent.setup();
    const alert = vi.spyOn(Alert, 'alert');
    const { callbacks } = renderDay({ canRemoveDay: true });

    await user.press(screen.getByRole('button', { name: 'Remover Treino A' }));

    expect(alert).toHaveBeenCalledWith(
      'Remover dia?',
      'O dia Treino A e seus exercícios serão removidos deste treino.',
      expect.any(Array),
    );
    expect(callbacks.onRemoveDay).not.toHaveBeenCalled();
    const buttons = alert.mock.calls[0]?.[2];
    await buttons?.[1]?.onPress?.();
    expect(callbacks.onRemoveDay).toHaveBeenCalledOnce();

    renderDay({ canRemoveDay: false });
    expect(
      screen.getByRole('button', { name: 'Remover Treino A' }).props.accessibilityState,
    ).toEqual(expect.objectContaining({ disabled: true }));
  });
});
