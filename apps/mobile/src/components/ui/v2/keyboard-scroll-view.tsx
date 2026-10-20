import { forwardRef, useCallback, useEffect, useRef } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  type ScrollViewProps,
} from 'react-native';
import { spacing } from '../../../lib/design-system/tokens';

export const KeyboardScrollView = forwardRef<ScrollView, ScrollViewProps>(
  function KeyboardScrollView(
    { onFocus, onBlur, onLayout, style, keyboardShouldPersistTaps = 'handled', ...props },
    forwardedRef,
  ) {
    const scrollRef = useRef<ScrollView | null>(null);
    const focusedInput = useRef<number | null>(null);
    const setScrollRef = useCallback(
      (node: ScrollView | null) => {
        scrollRef.current = node;
        if (typeof forwardedRef === 'function') forwardedRef(node);
        else if (forwardedRef) forwardedRef.current = node;
      },
      [forwardedRef],
    );

    const revealFocusedInput = useCallback(() => {
      const input = focusedInput.current;
      const scroll = scrollRef.current;
      if (input === null || !scroll || !Keyboard.isVisible()) return;
      scroll.getNativeScrollRef()?.measureInWindow((_x: number, top: number) => {
        if (focusedInput.current !== input || scrollRef.current !== scroll || !Keyboard.isVisible())
          return;
        // O campo é medido no conteúdo; o teclado informa coordenadas da janela.
        const clearance = spacing.xxxl + spacing.lg;
        scroll.scrollResponderScrollNativeHandleToKeyboard(input, top + clearance, true);
      });
    }, []);

    useEffect(() => {
      const subscription = Keyboard.addListener('keyboardDidShow', revealFocusedInput);
      return () => subscription.remove();
    }, [revealFocusedInput]);

    return (
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          {...props}
          ref={setScrollRef}
          style={[{ flex: 1 }, style]}
          keyboardShouldPersistTaps={keyboardShouldPersistTaps}
          onFocus={(event) => {
            focusedInput.current = event.nativeEvent.target;
            revealFocusedInput();
            onFocus?.(event);
          }}
          onBlur={(event) => {
            if (focusedInput.current === event.nativeEvent.target) focusedInput.current = null;
            onBlur?.(event);
          }}
          onLayout={(event) => {
            revealFocusedInput();
            onLayout?.(event);
          }}
        />
      </KeyboardAvoidingView>
    );
  },
);
