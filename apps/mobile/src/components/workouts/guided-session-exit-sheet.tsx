import { Modal, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing } from '../../lib/design-system/tokens';
import { ActionFeedback } from '../ui/v2/action-feedback';
import { Button } from '../ui/v2/button';
import { SheetSurface } from '../ui/v2/sheet-surface';
import { Text } from '../ui/v2/text';
import { ToastProvider } from '../ui/v2/toast';

export type GuidedSessionExitSheetProps = {
  visible: boolean;
  busy: boolean;
  context: string;
  storageError: string | null;
  onContinue: () => void;
  onSave: () => Promise<void>;
  onDiscard: () => Promise<void>;
};

export function GuidedSessionExitSheet({
  visible,
  busy,
  context,
  storageError,
  onContinue,
  onSave,
  onDiscard,
}: GuidedSessionExitSheetProps): React.JSX.Element {
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
          <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: colors.scrim }}>
            <SheetSurface style={{ paddingBottom: Math.max(insets.bottom, spacing.xxl) }}>
              <View className="gap-2">
                <Text accessibilityRole="header" variant="sectionTitle">
                  Sair da sessão
                </Text>
                <Text className="text-v2-secondary" variant="body">
                  Escolha como deseja sair.
                </Text>
              </View>
              <Text variant="body">{context}</Text>
              {storageError ? (
                <ActionFeedback
                  title="Não foi possível salvar seu progresso"
                  description={storageError}
                  variant="error"
                />
              ) : null}
              <Button disabled={busy} label="Continuar treinando" onPress={onContinue} />
              <Button
                disabled={busy}
                label="Salvar e sair"
                onPress={() => void onSave()}
                variant="secondary"
              />
              <Button
                disabled={busy}
                label="Descartar treino"
                onPress={() => void onDiscard()}
                variant="destructive"
              />
              <Text className="text-v2-secondary" variant="support">
                Você poderá retomar depois se escolher salvar e sair.
              </Text>
            </SheetSurface>
          </View>
        </ToastProvider>
      ) : null}
    </Modal>
  );
}
