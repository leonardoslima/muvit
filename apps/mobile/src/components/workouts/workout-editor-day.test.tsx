import { fireEvent, render, screen, userEvent } from '@testing-library/react-native';
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

    expect(screen.getByRole('header', { name: 'Treino A' })).toBeTruthy();
    expect(screen.queryByLabelText('Nome do dia')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Editar nome de Treino A' })).toBeNull();
    expect(screen.getByText('Supino reto')).toBeTruthy();
    expect(screen.getByText('Peito · Exercício 01')).toBeTruthy();
    expect(screen.getByText('1 exercício cadastrado')).toBeTruthy();
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

    expect(screen.getByText('Nenhum exercício cadastrado')).toBeTruthy();
    await user.press(screen.getByRole('button', { name: 'Adicionar exercício' }));

    expect(callbacks.onAddExercise).toHaveBeenCalledOnce();
  });

  it('emite alterações com o localId do dia e do exercício', () => {
    const { callbacks } = renderDay();

    fireEvent.changeText(screen.getByLabelText('Séries'), '4');
    fireEvent.changeText(screen.getByLabelText('Repetições'), '8-10');
    fireEvent.changeText(screen.getByLabelText('Carga'), '80,5');
    fireEvent.changeText(screen.getByLabelText('Descanso'), '90');
    fireEvent.changeText(screen.getByLabelText('Observação'), 'Controlar a descida');

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
    expect(screen.getByText('Remover exercício?')).toBeTruthy();
    expect(
      screen.getByText('O exercício Supino reto será removido deste dia de treino.'),
    ).toBeTruthy();
    expect(callbacks.onRemoveExercise).not.toHaveBeenCalled();
    await user.press(screen.getByRole('button', { name: 'Cancelar' }));
    expect(screen.queryByText('Remover exercício?')).toBeNull();
    expect(callbacks.onRemoveExercise).not.toHaveBeenCalled();
    await user.press(screen.getByRole('button', { name: 'Remover Supino reto' }));
    await user.press(screen.getByRole('button', { name: 'Remover exercício' }));
    expect(callbacks.onRemoveExercise).toHaveBeenCalledExactlyOnceWith('exercise-1');
  });

  it('bloqueia todos os controles quando desabilitado', () => {
    renderDay({ disabled: true });

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

  it('permite editar diretamente pelo campo sem lápis ou estado de edição no cartão', () => {
    const { callbacks } = renderDay();

    fireEvent(screen.getByLabelText('Carga'), 'focus', { nativeEvent: {} });
    fireEvent.changeText(screen.getByLabelText('Carga'), '40');

    expect(callbacks.onFocusExercise).toHaveBeenCalledWith('exercise-1');
    expect(callbacks.onChangeExercise).toHaveBeenCalledWith('exercise-1', 'loadKg', '40');
    expect(screen.queryByRole('button', { name: 'Editar exercício Supino reto' })).toBeNull();
    expect(screen.queryByText('Editando exercício')).toBeNull();
  });

  it('oculta o indicador de alteração não salva ao restaurar o baseline', () => {
    const { rerender } = render(
      <WorkoutEditorDayView
        canRemoveDay={false}
        day={dayFixture()}
        dirtyExerciseIds={['exercise-1']}
        onAddExercise={vi.fn()}
        onChangeExercise={vi.fn()}
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
        onAddExercise={vi.fn()}
        onChangeExercise={vi.fn()}
        onFocusExercise={vi.fn()}
        onMoveExercise={vi.fn()}
        onRemoveDay={vi.fn()}
        onRemoveExercise={vi.fn()}
      />,
    );

    expect(screen.queryByText('Editando exercício')).toBeNull();
    expect(screen.queryByText('Alterações não salvas')).toBeNull();
  });

  it('confirma a remoção do dia vazio e mantém o dia ao cancelar', async () => {
    const user = userEvent.setup();
    const { callbacks } = renderDay({ day: dayFixture([]), canRemoveDay: true });

    await user.press(screen.getByRole('button', { name: 'Remover Treino A' }));

    expect(screen.getByText('Remover dia?')).toBeTruthy();
    expect(callbacks.onRemoveDay).not.toHaveBeenCalled();
    await user.press(screen.getByRole('button', { name: 'Cancelar' }));
    expect(screen.queryByText('Remover dia?')).toBeNull();
    expect(callbacks.onRemoveDay).not.toHaveBeenCalled();
    await user.press(screen.getByRole('button', { name: 'Remover Treino A' }));
    await user.press(screen.getByRole('button', { name: 'Remover dia' }));
    expect(callbacks.onRemoveDay).toHaveBeenCalledOnce();
  });

  it('mostra confirmação do design para remover dia preenchido e impede remover o último dia', async () => {
    const user = userEvent.setup();
    const { callbacks } = renderDay({ canRemoveDay: true });

    await user.press(screen.getByRole('button', { name: 'Remover Treino A' }));

    expect(screen.getByText('Remover dia?')).toBeTruthy();
    expect(
      screen.getByText('O dia Treino A e seus exercícios serão removidos deste treino.'),
    ).toBeTruthy();
    expect(callbacks.onRemoveDay).not.toHaveBeenCalled();
    await user.press(screen.getByRole('button', { name: 'Remover dia' }));
    expect(callbacks.onRemoveDay).toHaveBeenCalledOnce();

    renderDay({ canRemoveDay: false });
    expect(
      screen.getByRole('button', { name: 'Remover Treino A' }).props.accessibilityState,
    ).toEqual(expect.objectContaining({ disabled: true }));
  });
});
