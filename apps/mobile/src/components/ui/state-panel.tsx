import { ActivityIndicator, Text, View } from 'react-native';
import { colors, sharedStyles, spacing } from '../../lib/styles';
import { AppButton } from './button';

export type StatePanelProps = {
  tone: 'loading' | 'empty' | 'error';
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function StatePanel({ actionLabel, description, onAction, title, tone }: StatePanelProps) {
  return (
    <View style={sharedStyles.statePanel}>
      {tone === 'loading' ? (
        <ActivityIndicator accessibilityLabel="Carregando" color={colors.primaryText} />
      ) : null}
      <Text style={sharedStyles.stateTitle}>{title}</Text>
      <Text style={sharedStyles.stateDescription}>{description}</Text>
      {actionLabel && onAction ? (
        <View style={{ marginTop: spacing.sm, width: '100%' }}>
          <AppButton label={actionLabel} onPress={onAction} variant="secondary" />
        </View>
      ) : null}
    </View>
  );
}
