import { Modal, Pressable, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing } from '../../lib/design-system/tokens';
import { ActionFeedback } from '../ui/v2/action-feedback';
import { Button } from '../ui/v2/button';
import { SheetSurface } from '../ui/v2/sheet-surface';
import { Text } from '../ui/v2/text';
import { ToastProvider } from '../ui/v2/toast';

export type WorkoutEditorExitSheetProps = {
  visible: boolean;
  busy: boolean;
  error?: string;
  onContinue: () => void;
  onSave: () => void;
  onDiscard: () => void;
};

export function WorkoutEditorExitSheet({
  visible,
  busy,
  error,
  onContinue,
  onSave,
  onDiscard,
}: WorkoutEditorExitSheetProps): React.JSX.Element {
  const insets = useSafeAreaInsets();

  return (
    <Modal
      animationType="slide"
      onRequestClose={() => {
        if (!busy) onContinue();
      }}
      transparent
      visible={visible}
    >
      {visible ? (
        <ToastProvider modal safeAreaView={SafeAreaView}>
          <View style={{ flex: 1, justifyContent: 'flex-end' }}>
            <Pressable
              accessibilityLabel="Fechar e continuar editando"
              accessibilityRole="button"
              disabled={busy}
              onPress={onContinue}
              style={{
                backgroundColor: colors.scrim,
                bottom: 0,
                left: 0,
                position: 'absolute',
                right: 0,
                top: 0,
              }}
            />
            <SheetSurface style={{ paddingBottom: Math.max(insets.bottom, spacing.xxl) }}>
              <View className="gap-2">
                <Text accessibilityRole="header" variant="sectionTitle">
                  Sair do editor?
                </Text>
                <Text className="text-v2-secondary" variant="body">
                  Suas alterações ainda não foram salvas.
                </Text>
              </View>
              {error ? (
                <ActionFeedback
                  title="Não foi possível salvar o rascunho"
                  description={error}
                  variant="error"
                />
              ) : null}
              <Button
                disabled={busy}
                label="Continuar editando"
                onPress={onContinue}
                variant="secondary"
              />
              <Button
                disabled={busy}
                label={
                  busy
                    ? 'Salvando rascunho...'
                    : error
                      ? 'Tentar salvar e sair'
                      : 'Salvar rascunho e sair'
                }
                onPress={onSave}
              />
              <Button
                disabled={busy}
                label="Descartar e sair"
                onPress={onDiscard}
                variant="destructive"
              />
            </SheetSurface>
          </View>
        </ToastProvider>
      ) : null}
    </Modal>
  );
}
