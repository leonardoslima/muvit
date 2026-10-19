import { fireEvent, render, screen } from '@testing-library/react-native';
import { Modal, StyleSheet } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import { withTiming } from 'react-native-reanimated';
import { describe, expect, it, vi } from 'vitest';
import type { MockPinchGesture } from '../../../test/gesture-animation.mock';
import { AssessmentPhotoViewer } from './assessment-photo-viewer';

vi.mock('react-native-safe-area-context', () => ({ SafeAreaView: 'View' }));

const photos = Array.from({ length: 8 }, (_, index) => `file:///${index + 1}.jpg`);

function renderViewer(index: number | null, onIndexChange = vi.fn(), onClose = vi.fn()) {
  const view = render(
    <AssessmentPhotoViewer
      index={index}
      onClose={onClose}
      onIndexChange={onIndexChange}
      photos={photos}
    />,
  );
  return { ...view, onClose, onIndexChange };
}

describe('AssessmentPhotoViewer', () => {
  it('amplia durante a pinça e volta ao tamanho normal ao soltar ou cancelar', () => {
    renderViewer(0);
    const gesture: MockPinchGesture = screen.UNSAFE_getByType(GestureDetector).props.gesture;
    const image = screen.getByLabelText('Prévia ampliada da foto 1');
    const scale = () => StyleSheet.flatten(image.props.style).transform;
    expect(scale()).toEqual([{ scale: 1 }]);
    gesture.handlers.start?.();
    gesture.handlers.update?.({ scale: 2.5 });
    expect(scale()).toEqual([{ scale: 2.5 }]);
    gesture.handlers.finalize?.(true);
    expect(withTiming).toHaveBeenCalledWith(1, { duration: 180 });
    expect(scale()).toEqual([{ scale: 1 }]);
    gesture.handlers.update?.({ scale: 3 });
    gesture.handlers.finalize?.(false);
    expect(scale()).toEqual([{ scale: 1 }]);
  });

  it('limita a ampliação e inicia a próxima foto sem zoom', () => {
    const { rerender } = renderViewer(0);
    const gesture: MockPinchGesture = screen.UNSAFE_getByType(GestureDetector).props.gesture;
    gesture.handlers.update?.({ scale: 8 });
    expect(
      StyleSheet.flatten(screen.getByLabelText('Prévia ampliada da foto 1').props.style).transform,
    ).toEqual([{ scale: 4 }]);
    gesture.handlers.update?.({ scale: 0.5 });
    expect(
      StyleSheet.flatten(screen.getByLabelText('Prévia ampliada da foto 1').props.style).transform,
    ).toEqual([{ scale: 1 }]);
    gesture.handlers.update?.({ scale: 3 });
    rerender(
      <AssessmentPhotoViewer
        index={1}
        onClose={() => undefined}
        onIndexChange={() => undefined}
        photos={photos}
      />,
    );
    expect(
      StyleSheet.flatten(screen.getByLabelText('Prévia ampliada da foto 2').props.style).transform,
    ).toEqual([{ scale: 1 }]);
  });

  it('identifica a posição da foto no cabeçalho e exibe a imagem em contain', () => {
    renderViewer(0);

    expect(screen.getByText('Foto 1 de 8')).toBeTruthy();
    const image = screen.getByLabelText('Prévia ampliada da foto 1');
    expect(image.props.source.uri).toBe(photos[0]);
    expect(image.props.resizeMode).toBe('contain');
  });

  it('avança e retorna pelo índice sem fazer wrap', () => {
    const { onIndexChange, rerender } = renderViewer(0);

    expect(
      screen.getByRole('button', { name: 'Foto anterior' }).props.accessibilityState.disabled,
    ).toBe(true);
    fireEvent.press(screen.getByRole('button', { name: 'Próxima foto' }));
    expect(onIndexChange).toHaveBeenCalledWith(1);

    rerender(
      <AssessmentPhotoViewer
        index={7}
        onClose={() => undefined}
        onIndexChange={onIndexChange}
        photos={photos}
      />,
    );
    expect(
      screen.getByRole('button', { name: 'Próxima foto' }).props.accessibilityState.disabled,
    ).toBe(true);
    fireEvent.press(screen.getByRole('button', { name: 'Foto anterior' }));
    expect(onIndexChange).toHaveBeenLastCalledWith(6);
  });

  it('oculta os controles de navegação para uma foto', () => {
    render(
      <AssessmentPhotoViewer
        index={0}
        onClose={() => undefined}
        onIndexChange={() => undefined}
        photos={[photos[0]]}
      />,
    );

    expect(screen.queryByRole('button', { name: 'Foto anterior' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Próxima foto' })).toBeNull();
  });

  it('fecha pelo pedido do sistema Android', () => {
    const { onClose } = renderViewer(0);

    screen.UNSAFE_getByType(Modal).props.onRequestClose();

    expect(onClose).toHaveBeenCalledOnce();
  });

  it('fecha pelo cabeçalho e restringe o contexto de acessibilidade ao modal', () => {
    const { onClose } = renderViewer(0);

    fireEvent.press(screen.getByRole('button', { name: 'Fechar fotos' }));

    expect(onClose).toHaveBeenCalledOnce();
    expect(screen.UNSAFE_getByProps({ accessibilityViewIsModal: true }).props['aria-modal']).toBe(
      true,
    );
  });

  it.each([null, -1, 1.5, Number.NaN, 8])('não monta Modal para índice inválido %s', (index) => {
    const { UNSAFE_queryByType } = renderViewer(index);

    expect(UNSAFE_queryByType(Modal)).toBeNull();
  });

  it('não expõe ações de upload, remoção, download ou compartilhamento', () => {
    renderViewer(0);

    expect(
      screen.queryByRole('button', { name: /adicionar|remover|baixar|compartilhar/i }),
    ).toBeNull();
  });
});
