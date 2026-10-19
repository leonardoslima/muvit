import { CircleX, X } from 'lucide-react-native';
import {
  type PropsWithChildren,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AccessibilityInfo, Platform, View } from 'react-native';
import type { SafeAreaView } from 'react-native-safe-area-context';
import { colors, radii, spacing } from '../../../lib/design-system/tokens';
import { Button } from './button';
import type { Action } from './control';
import { IconButton } from './icon-button';
import { Text } from './text';

type ToastContent = {
  title?: string;
  description?: string;
  action?: Action;
  testID?: string;
  eventKey?: string | number;
};
type ToastEntry = ToastContent & { id: number };
type ToastController = { show: (content: ToastContent) => number; dismiss: (id: number) => void };
const ToastContext = createContext<ToastController | null>(null);

export function useToast(): ToastController {
  const controller = useContext(ToastContext);
  if (!controller) throw new Error('O toast precisa estar dentro de um ToastProvider.');
  return controller;
}

export function ToastProvider({
  children,
  safeAreaView,
  modal = false,
}: PropsWithChildren<{ safeAreaView?: typeof SafeAreaView; modal?: boolean }>): React.JSX.Element {
  const Overlay = safeAreaView ?? View;
  const [toast, setToast] = useState<ToastEntry | null>(null);
  const sequence = useRef(0);
  const show = useCallback((content: ToastContent): number => {
    const id = ++sequence.current;
    setToast({ ...content, id });
    return id;
  }, []);
  const dismiss = useCallback((id: number): void => {
    setToast((current) => (current?.id === id ? null : current));
  }, []);
  const controller = useMemo(() => ({ show, dismiss }), [show, dismiss]);

  useEffect(() => {
    if (!toast) return;
    let active = true;
    let timeout = setTimeout(() => dismiss(toast.id), 5000);
    if (Platform.OS === 'android') {
      void AccessibilityInfo.getRecommendedTimeoutMillis?.(5000)
        .then((duration: number) => {
          if (!active) return;
          clearTimeout(timeout);
          timeout = setTimeout(() => dismiss(toast.id), Math.max(5000, duration));
        })
        .catch(() => undefined);
    } else {
      AccessibilityInfo.announceForAccessibility?.(
        [toast.title, toast.description].filter(Boolean).join('. '),
      );
    }
    return () => {
      active = false;
      clearTimeout(timeout);
    };
  }, [toast, dismiss]);

  return (
    <ToastContext.Provider value={controller}>
      <View accessibilityViewIsModal={modal} style={{ flex: 1 }}>
        {children}
        {toast ? (
          <Overlay
            edges={['top', 'left', 'right']}
            pointerEvents="box-none"
            testID="toast-overlay"
            style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 1000, elevation: 2 }}
          >
            <View
              testID={toast.testID ?? 'error-toast'}
              className="flex-row items-start gap-3"
              style={{
                margin: spacing.lg,
                padding: spacing.md,
                borderRadius: radii.field,
                backgroundColor: colors.errorBg,
                borderWidth: 1,
                borderColor: colors.error,
              }}
            >
              <View className="pt-3">
                <CircleX accessible={false} color={colors.error} size={22} />
              </View>
              <View className="min-w-0 flex-1 gap-2 py-2">
                <View
                  accessible
                  accessibilityRole="alert"
                  accessibilityLabel={[toast.title, toast.description].filter(Boolean).join('. ')}
                  accessibilityLiveRegion="polite"
                >
                  {toast.title ? (
                    <Text className="text-v2-error" variant="label">
                      {toast.title}
                    </Text>
                  ) : null}
                  {toast.description ? (
                    <Text className="text-v2-error">{toast.description}</Text>
                  ) : null}
                </View>
                {toast.action ? (
                  <Button {...toast.action} compact variant="text" labelClassName="text-v2-error" />
                ) : null}
              </View>
              <IconButton
                accessibilityLabel="Fechar mensagem"
                variant="text"
                icon={<X accessible={false} color={colors.error} size={20} />}
                onPress={() => dismiss(toast.id)}
              />
            </View>
          </Overlay>
        ) : null}
      </View>
    </ToastContext.Provider>
  );
}
