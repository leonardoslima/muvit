import { act, fireEvent, render, screen } from '@testing-library/react-native';
import type { ScrollViewProps } from 'react-native';
import { KeyboardAvoidingView, ScrollView, TextInput } from 'react-native';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { spacing } from '../../lib/design-system/tokens';
import { GuidedSessionLayout } from './guided-session-layout';

const keyboard = vi.hoisted(() => ({
  platform: 'android' as 'android' | 'ios',
  visible: false,
  scrollTop: 0,
  listeners: new Map<string, () => void>(),
  remove: vi.fn(),
  scrollToInput: vi.fn(),
}));

vi.mock('@react-navigation/native', () => ({ useIsFocused: () => true }));
vi.mock('expo-status-bar', () => ({ StatusBar: () => null }));
vi.mock('react-native-safe-area-context', () => ({
  SafeAreaView: 'SafeAreaView',
  useSafeAreaInsets: () => ({ top: 0, bottom: 24, left: 0, right: 0 }),
}));
vi.mock('react-native', async (importOriginal) => {
  const native = await importOriginal<typeof import('react-native')>();
  const React = await import('react');
  return {
    ...native,
    Platform: {
      ...native.Platform,
      get OS() {
        return keyboard.platform;
      },
    },
    Keyboard: {
      isVisible: () => keyboard.visible,
      addListener: (name: string, callback: () => void) => {
        keyboard.listeners.set(name, callback);
        return { remove: keyboard.remove };
      },
    },
    ScrollView: React.forwardRef<unknown, ScrollViewProps>((props, ref) => {
      React.useImperativeHandle(ref, () => ({
        scrollResponderScrollNativeHandleToKeyboard: keyboard.scrollToInput,
        getNativeScrollRef: () => ({
          measureInWindow: (
            callback: (x: number, y: number, width: number, height: number) => void,
          ) => callback(0, keyboard.scrollTop, 390, 400),
        }),
      }));
      return React.createElement(native.ScrollView, props);
    }),
  };
});

describe.each([
  ['android', 'height'],
  ['ios', 'padding'],
] as const)('teclado da sessão guiada no %s', (platform, behavior) => {
  beforeEach(() => {
    vi.clearAllMocks();
    keyboard.visible = false;
    keyboard.scrollTop = 0;
    keyboard.platform = platform;
    keyboard.listeners.clear();
  });

  function renderLayout() {
    return render(
      <GuidedSessionLayout>
        <TextInput accessibilityLabel="Carga" />
      </GuidedSessionLayout>,
    );
  }

  it('ajusta a área rolável ao teclado e remove o listener ao sair', () => {
    const view = renderLayout();
    expect(screen.UNSAFE_getByType(KeyboardAvoidingView).props.behavior).toBe(behavior);
    view.unmount();
    expect(keyboard.remove).toHaveBeenCalledOnce();
  });

  it('revela o campo após abrir o teclado e após redimensionar a área rolável', () => {
    renderLayout();
    const scroll = screen.UNSAFE_getByType(ScrollView);
    fireEvent(scroll, 'focus', { nativeEvent: { target: 42 } });
    expect(keyboard.scrollToInput).not.toHaveBeenCalled();
    keyboard.visible = true;
    act(() => keyboard.listeners.get('keyboardDidShow')?.());
    expect(keyboard.scrollToInput).toHaveBeenCalledWith(42, expect.any(Number), true);
    keyboard.scrollToInput.mockClear();
    fireEvent(scroll, 'layout', { nativeEvent: { layout: { height: 400 } } });
    expect(keyboard.scrollToInput).toHaveBeenCalledWith(42, expect.any(Number), true);
  });

  it('acompanha a troca de campo com teclado aberto e para ao perder o foco', () => {
    renderLayout();
    keyboard.visible = true;
    const scroll = screen.UNSAFE_getByType(ScrollView);
    fireEvent(scroll, 'focus', { nativeEvent: { target: 42 } });
    fireEvent(scroll, 'focus', { nativeEvent: { target: 43 } });
    expect(keyboard.scrollToInput).toHaveBeenLastCalledWith(43, expect.any(Number), true);
    fireEvent(scroll, 'blur', { nativeEvent: { target: 43 } });
    keyboard.scrollToInput.mockClear();
    act(() => keyboard.listeners.get('keyboardDidShow')?.());
    expect(keyboard.scrollToInput).not.toHaveBeenCalled();
  });

  it('compensa a posição da área rolável abaixo da safe area e do cabeçalho', () => {
    renderLayout();
    keyboard.visible = true;
    keyboard.scrollTop = 120;
    fireEvent(screen.UNSAFE_getByType(ScrollView), 'focus', { nativeEvent: { target: 42 } });
    expect(keyboard.scrollToInput).toHaveBeenCalledWith(42, 120 + spacing.xxxl + spacing.lg, true);
  });

  it('reserva folga abaixo dos controles, sem encostar o valor no teclado', () => {
    renderLayout();
    keyboard.visible = true;
    fireEvent(screen.UNSAFE_getByType(ScrollView), 'focus', { nativeEvent: { target: 42 } });
    expect(keyboard.scrollToInput).toHaveBeenCalledWith(42, spacing.xxxl + spacing.lg, true);
  });
});
