import { act, render, screen, userEvent, waitFor } from '@testing-library/react-native';
import React, { type ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { WorkoutDay } from '../../application/workouts/today-workout';
import { StudentExerciseList } from './student-exercise-list';

const navigationState = vi.hoisted(() => ({
  focusListener: undefined as (() => void) | undefined,
}));
const nativeAccessibility = vi.hoisted(() => {
  const handlesByNode = new Map<object, number>();
  const handlesByLabel = new Map<string, number>();
  let nextHandle = 1;
  return {
    createFocusableNode: (label: string) => {
      const node = {};
      const handle = nextHandle++;
      handlesByNode.set(node, handle);
      handlesByLabel.set(label, handle);
      return node;
    },
    findNodeHandle: vi.fn((node: object) => handlesByNode.get(node) ?? null),
    handleFor: (label: string) => handlesByLabel.get(label),
    resetHandles: () => {
      handlesByNode.clear();
      handlesByLabel.clear();
      nextHandle = 1;
    },
    setAccessibilityFocus: vi.fn(),
  };
});

vi.mock('expo-router', () => ({
  useNavigation: () => ({
    addListener: (_event: string, listener: () => void) => {
      navigationState.focusListener = listener;
      return () => {
        navigationState.focusListener = undefined;
      };
    },
  }),
}));

vi.mock('react-native', async (importOriginal) => {
  const original = await importOriginal<Record<string, unknown>>();
  const focusablePressable = React.forwardRef<
    object,
    { accessibilityLabel?: string; children?: ReactNode; [key: string]: unknown }
  >(function FocusablePressable(props, ref) {
    const nativeNode = React.useMemo(
      () => nativeAccessibility.createFocusableNode(String(props.accessibilityLabel ?? '')),
      [props.accessibilityLabel],
    );
    React.useImperativeHandle(ref, () => nativeNode, [nativeNode]);
    const NativeView = original.View as React.ComponentType<{
      children?: ReactNode;
      [key: string]: unknown;
    }>;
    return React.createElement(NativeView, props);
  });
  return {
    ...original,
    AccessibilityInfo: { setAccessibilityFocus: nativeAccessibility.setAccessibilityFocus },
    findNodeHandle: nativeAccessibility.findNodeHandle,
    Pressable: focusablePressable,
  };
});

const day: WorkoutDay = {
  id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
  label: 'Treino A',
  dayOrder: 0,
  planId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  exercises: [
    {
      id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
      workoutDayId: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
      exerciseId: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
      exerciseOrder: 0,
      sets: 2,
      reps: '10',
      restSeconds: 60,
      loadKg: 20,
      notes: null,
      tempo: null,
      exercise: {
        id: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
        name: 'Supino',
        muscleGroup: 'chest',
      },
    },
    {
      id: 'ffffffff-ffff-4fff-8fff-ffffffffffff',
      workoutDayId: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
      exerciseId: '11111111-1111-4111-8111-111111111111',
      exerciseOrder: 1,
      sets: 1,
      reps: '12',
      restSeconds: 45,
      loadKg: null,
      notes: null,
      tempo: null,
      exercise: {
        id: '11111111-1111-4111-8111-111111111111',
        name: 'Remada',
        muscleGroup: 'back',
      },
    },
  ],
};

describe('StudentExerciseList', () => {
  beforeEach(() => {
    navigationState.focusListener = undefined;
    vi.restoreAllMocks();
    nativeAccessibility.resetHandles();
  });

  it('exibe preview numerado com nomes e rótulos acessíveis em português', () => {
    render(<StudentExerciseList day={day} onExercisePress={vi.fn()} variant="preview" />);

    expect(screen.getByText('01')).toBeTruthy();
    expect(screen.getByText('02')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Ver detalhes de Supino, Peito' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Ver detalhes de Remada, Costas' })).toBeTruthy();
  });

  it('envia o ID da prescrição ao selecionar a linha inteira', async () => {
    const onExercisePress = vi.fn();
    const user = userEvent.setup();
    render(<StudentExerciseList day={day} onExercisePress={onExercisePress} variant="preview" />);

    await user.press(screen.getByRole('button', { name: 'Ver detalhes de Supino, Peito' }));

    expect(onExercisePress).toHaveBeenCalledWith('dddddddd-dddd-4ddd-8ddd-dddddddddddd');
    expect(onExercisePress).not.toHaveBeenCalledWith('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee');
  });

  it('exibe prescrição detalhada e mantém o grupo muscular no rótulo acessível', () => {
    render(<StudentExerciseList day={day} onExercisePress={vi.fn()} variant="detailed" />);

    expect(screen.getByText('2 séries · 10 repetições')).toBeTruthy();
    expect(screen.getByText('Descanso: 60 s')).toBeTruthy();
    expect(screen.queryByText('Peito')).toBeNull();
    expect(screen.getByRole('button', { name: 'Ver detalhes de Supino, Peito' })).toBeTruthy();
    expect(screen.queryByText('chest')).toBeNull();
  });

  it('restaura o foco na linha acionada quando a tela de origem volta ao foco', async () => {
    const user = userEvent.setup();
    nativeAccessibility.setAccessibilityFocus.mockClear();
    const props = { day, onExercisePress: vi.fn(), variant: 'preview' as const };
    render(<StudentExerciseList {...props} />);
    const remadaHandle = nativeAccessibility.handleFor('Ver detalhes de Remada, Costas');
    const supinoHandle = nativeAccessibility.handleFor('Ver detalhes de Supino, Peito');

    expect(remadaHandle).toBeTypeOf('number');
    expect(supinoHandle).toBeTypeOf('number');
    expect(remadaHandle).not.toBe(supinoHandle);

    await user.press(screen.getByRole('button', { name: 'Ver detalhes de Remada, Costas' }));
    expect(nativeAccessibility.setAccessibilityFocus).not.toHaveBeenCalled();

    await act(async () => navigationState.focusListener?.());

    await waitFor(() =>
      expect(nativeAccessibility.setAccessibilityFocus.mock.calls).toEqual([[remadaHandle]]),
    );
    expect(nativeAccessibility.setAccessibilityFocus).not.toHaveBeenCalledWith(supinoHandle);
  });
});
