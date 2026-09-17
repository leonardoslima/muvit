import { render, screen, userEvent } from '@testing-library/react-native';
import type { ComponentProps } from 'react';
import { StyleSheet } from 'react-native';
import { describe, expect, it, vi } from 'vitest';
import { colors, controlSizes, radii, spacing, typography } from '../../lib/styles';
import { ExerciseDetailsModal } from './exercise-details-modal';

vi.mock('react-native-safe-area-context', () => ({
  SafeAreaView: 'SafeAreaView',
}));

type ExerciseDetails = NonNullable<ComponentProps<typeof ExerciseDetailsModal>['exercise']>;

const exercise: ExerciseDetails = {
  id: '11111111-1111-4111-8111-111111111111',
  workoutDayId: '22222222-2222-4222-8222-222222222222',
  exerciseId: '33333333-3333-4333-8333-333333333333',
  exerciseOrder: 0,
  sets: 3,
  reps: '10',
  loadKg: 20,
  restSeconds: 60,
  notes: 'Controle a descida.',
  tempo: null,
  exercise: {
    id: '33333333-3333-4333-8333-333333333333',
    name: 'Supino',
    muscleGroup: 'Peito',
  },
};

describe('ExerciseDetailsModal', () => {
  it('renderiza todos os detalhes e fecha pela ação acessível', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();

    render(<ExerciseDetailsModal exercise={exercise} onClose={onClose} />);

    expect(screen.getByTestId('bottom-sheet-handle')).toBeTruthy();
    expect(screen.getByText('Supino')).toBeTruthy();
    expect(screen.getByText('Grupo muscular: Peito')).toBeTruthy();
    expect(screen.getByText('3')).toBeTruthy();
    expect(screen.getByText('Séries')).toBeTruthy();
    expect(screen.getByText('10')).toBeTruthy();
    expect(screen.getByText('Repetições')).toBeTruthy();
    expect(screen.getByText('60 s')).toBeTruthy();
    expect(screen.getByText('Descanso')).toBeTruthy();
    expect(screen.getByText('Notas do treinador')).toBeTruthy();
    expect(screen.getByText('Controle a descida.')).toBeTruthy();

    await user.press(screen.getByRole('button', { name: 'Fechar' }));

    expect(onClose).toHaveBeenCalledOnce();
  });

  it('não renderiza conteúdo sem exercício selecionado', () => {
    render(<ExerciseDetailsModal onClose={() => undefined} />);

    expect(screen.queryByText('Fechar')).toBeNull();
  });

  it('aproxima a superfície do Pencil com 614 dp e respeita os tokens do sheet', () => {
    render(<ExerciseDetailsModal exercise={exercise} onClose={() => undefined} />);

    const surface = screen.getByTestId('bottom-sheet-surface');

    expect(StyleSheet.flatten(surface.props.style)).toMatchObject({
      backgroundColor: colors.surface,
      borderTopLeftRadius: radii.sheet,
      borderTopRightRadius: radii.sheet,
      height: 614,
      paddingBottom: spacing.xxl,
      paddingHorizontal: spacing.xl,
      paddingTop: spacing.md,
    });
    const content = surface.props.children[1];
    expect(StyleSheet.flatten(content.props.style)).toMatchObject({
      alignSelf: 'stretch',
      gap: spacing.md,
    });
  });

  it('organiza título, subtítulo, métricas e notas em grupos verticais', () => {
    render(<ExerciseDetailsModal exercise={exercise} onClose={() => undefined} />);

    expect(
      StyleSheet.flatten(screen.getByTestId('exercise-details-content').props.style),
    ).toMatchObject({
      flex: 1,
      gap: spacing.lg,
      width: '100%',
    });
    expect(StyleSheet.flatten(screen.getByText('Grupo muscular: Peito').props.style)).toMatchObject(
      {
        color: colors.muted,
        fontFamily: typography.input.fontFamily,
        fontSize: typography.input.fontSize,
      },
    );

    expect(
      StyleSheet.flatten(screen.getByTestId('exercise-details-metrics').props.style),
    ).toMatchObject({
      flexDirection: 'row',
      gap: spacing.sm,
      width: '100%',
    });
    expect(
      StyleSheet.flatten(screen.getByTestId('exercise-details-metric-sets').props.style),
    ).toMatchObject({
      alignItems: 'center',
      backgroundColor: colors.surfaceMuted,
      borderRadius: radii.md,
      flex: 1,
      gap: spacing.xs,
      padding: spacing.md,
    });
    expect(
      StyleSheet.flatten(screen.getByTestId('exercise-details-notes').props.style),
    ).toMatchObject({
      backgroundColor: colors.background,
      borderColor: colors.line,
      borderRadius: radii.md,
      borderWidth: 1,
      gap: spacing.sm,
      padding: spacing.lg,
    });
  });

  it('centraliza o botão Fechar com 342 por 48 dp', () => {
    render(<ExerciseDetailsModal exercise={exercise} onClose={() => undefined} />);

    expect(
      StyleSheet.flatten(screen.getByTestId('exercise-details-close-button').props.style),
    ).toMatchObject({
      alignSelf: 'center',
      maxWidth: '100%',
      width: 342,
    });

    const button = screen.getByRole('button', { name: 'Fechar' });
    const buttonStyle = button.props.style;

    expect(typeof buttonStyle).toBe('function');
    if (typeof buttonStyle !== 'function') {
      throw new Error('O botão Fechar deve expor o estado de pressão no estilo.');
    }
    expect(StyleSheet.flatten(buttonStyle({ pressed: false }))).toMatchObject({
      height: controlSizes.button,
      minHeight: controlSizes.button,
    });
  });
});
