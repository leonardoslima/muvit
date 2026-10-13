import { type ReactNode, useState } from 'react';
import { ActivityIndicator, type LayoutChangeEvent, View } from 'react-native';
import { colors } from '../../lib/design-system/tokens';
import { Screen } from '../ui/screen';
import { Header } from '../ui/v2/header';
import { Text } from '../ui/v2/text';

export type TrainerScreenProps = {
  title: string;
  subtitle?: string;
  contextual?: boolean;
  backLabel?: string;
  backDisabled?: boolean;
  onBack?: () => void;
  onRefresh?: () => void;
  refreshDisabled: boolean;
  refreshing?: boolean;
  children: ReactNode;
};

export function TrainerScreen({
  title,
  subtitle,
  contextual = false,
  backLabel = 'Voltar para alunos',
  backDisabled = false,
  onBack,
  onRefresh,
  refreshDisabled,
  refreshing = false,
  children,
}: TrainerScreenProps): React.JSX.Element {
  const [availableWidth, setAvailableWidth] = useState<number>();
  const titleClassName = contextual
    ? 'text-[15px] leading-[20px]'
    : availableWidth !== undefined && availableWidth <= 320
      ? 'text-[26px] leading-[31.2px]'
      : undefined;
  const handleLayout = (event: LayoutChangeEvent): void => {
    setAvailableWidth(event.nativeEvent.layout.width);
  };

  return (
    <Screen style={{ flex: 1, position: 'relative' }}>
      <View className="flex-1 gap-3" onLayout={handleLayout} testID="trainer-screen-content">
        <Header
          action={
            onRefresh
              ? {
                  label: 'Atualizar',
                  onPress: onRefresh,
                  disabled: refreshDisabled || refreshing,
                }
              : undefined
          }
          backAction={
            contextual && onBack
              ? { label: backLabel, onPress: onBack, disabled: backDisabled }
              : undefined
          }
          className="min-h-[48px]"
          title={title}
          titleClassName={titleClassName}
          variant={contextual ? 'contextual' : 'default'}
        />
        {subtitle ? <Text className="text-v2-secondary">{subtitle}</Text> : null}
        {children}
      </View>
      {refreshing ? (
        <View
          accessibilityLiveRegion="polite"
          className="absolute inset-0 z-50 items-center justify-center px-4"
          pointerEvents="none"
          style={{ backgroundColor: colors.scrim }}
        >
          <View className="items-center gap-3 rounded-v2-card bg-v2-surface px-6 py-5">
            <ActivityIndicator
              accessible
              accessibilityRole="progressbar"
              accessibilityLabel="Atualizando"
              color={colors.brand}
              size="large"
            />
            <Text className="text-center text-v2-brand" variant="sectionTitle">
              Atualizando
            </Text>
            <Text className="text-center text-v2-secondary">
              Aguarde enquanto os dados são atualizados.
            </Text>
          </View>
        </View>
      ) : null}
    </Screen>
  );
}
