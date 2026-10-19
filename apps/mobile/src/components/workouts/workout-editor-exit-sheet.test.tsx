import { fireEvent, render, screen } from '@testing-library/react-native';
import { describe, expect, it, vi } from 'vitest';
import { WorkoutEditorExitSheet } from './workout-editor-exit-sheet';

vi.mock('react-native-safe-area-context', () => ({
  SafeAreaView: 'View',
  useSafeAreaInsets: () => ({ bottom: 0, left: 0, right: 0, top: 0 }),
}));

describe('WorkoutEditorExitSheet', () => {
  it('mantém valores sob controle do editor e oferece continuar, salvar e descartar', () => {
    const onContinue = vi.fn();
    const onSave = vi.fn();
    const onDiscard = vi.fn();

    render(
      <WorkoutEditorExitSheet
        visible
        busy={false}
        error={undefined}
        onContinue={onContinue}
        onSave={onSave}
        onDiscard={onDiscard}
      />,
    );

    fireEvent.press(screen.getByRole('button', { name: 'Continuar editando' }));
    fireEvent.press(screen.getByRole('button', { name: 'Salvar rascunho e sair' }));
    fireEvent.press(screen.getByRole('button', { name: 'Descartar e sair' }));

    expect(onContinue).toHaveBeenCalledOnce();
    expect(onSave).toHaveBeenCalledOnce();
    expect(onDiscard).toHaveBeenCalledOnce();
  });

  it('preserva a sheet e permite tentar novamente depois de falha', () => {
    render(
      <WorkoutEditorExitSheet
        visible
        busy={false}
        error="Não foi possível salvar o rascunho."
        onContinue={vi.fn()}
        onSave={vi.fn()}
        onDiscard={vi.fn()}
      />,
    );

    expect(screen.getByText('Não foi possível salvar o rascunho.')).toBeTruthy();
    expect(screen.getByTestId('toast-overlay')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Tentar salvar e sair' })).toBeTruthy();
  });

  it('bloqueia saída e ações enquanto a gravação está em andamento', () => {
    const onContinue = vi.fn();
    const onSave = vi.fn();
    const onDiscard = vi.fn();

    render(
      <WorkoutEditorExitSheet
        visible
        busy
        error={undefined}
        onContinue={onContinue}
        onSave={onSave}
        onDiscard={onDiscard}
      />,
    );

    for (const label of ['Continuar editando', 'Salvando rascunho...', 'Descartar e sair']) {
      expect(screen.getByRole('button', { name: label }).props.accessibilityState).toEqual(
        expect.objectContaining({ disabled: true }),
      );
    }
  });
});
