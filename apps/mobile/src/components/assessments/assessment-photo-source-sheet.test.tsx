import { fireEvent, render, screen, userEvent } from '@testing-library/react-native';
import { Modal, Platform } from 'react-native';
import { describe, expect, it, vi } from 'vitest';
import { AssessmentPhotoSourceSheet } from './assessment-photo-source-sheet';

describe('AssessmentPhotoSourceSheet', () => {
  it.each([
    ['Tirar foto', 'camera'],
    ['Escolher da biblioteca', 'library'],
  ])('aguarda fechar o sheet no iOS antes de selecionar %s', async (label, source) => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const onSelect = vi.fn();
    render(<AssessmentPhotoSourceSheet visible onClose={onClose} onSelect={onSelect} />);
    await user.press(screen.getByRole('button', { name: label }));
    expect(onClose).toHaveBeenCalledOnce();
    expect(onSelect).not.toHaveBeenCalled();
    fireEvent(screen.UNSAFE_getByType(Modal), 'dismiss');
    expect(onSelect).toHaveBeenCalledExactlyOnceWith(source);
  });

  it('seleciona a origem no Android sem aguardar um evento de dispensa do iOS', async () => {
    const originalOS = Platform.OS;
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'android' });
    try {
      const user = userEvent.setup();
      const onSelect = vi.fn();
      render(<AssessmentPhotoSourceSheet visible onClose={vi.fn()} onSelect={onSelect} />);
      await user.press(screen.getByRole('button', { name: 'Tirar foto' }));
      expect(onSelect).toHaveBeenCalledExactlyOnceWith('camera');
    } finally {
      Object.defineProperty(Platform, 'OS', { configurable: true, value: originalOS });
    }
  });

  it('cancela pelo botão e pelo Back sem selecionar uma origem', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const onSelect = vi.fn();
    render(<AssessmentPhotoSourceSheet visible onClose={onClose} onSelect={onSelect} />);
    await user.press(screen.getByRole('button', { name: 'Cancelar' }));
    fireEvent(screen.UNSAFE_getByType(Modal), 'requestClose');
    fireEvent(screen.UNSAFE_getByType(Modal), 'dismiss');
    expect(onClose).toHaveBeenCalledTimes(2);
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('ignora a escolha após sair da tela', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    const { unmount } = render(
      <AssessmentPhotoSourceSheet visible onClose={vi.fn()} onSelect={onSelect} />,
    );
    const dismiss = screen.UNSAFE_getByType(Modal).props.onDismiss;
    await user.press(screen.getByRole('button', { name: 'Tirar foto' }));
    unmount();
    dismiss();
    expect(onSelect).not.toHaveBeenCalled();
  });
});
