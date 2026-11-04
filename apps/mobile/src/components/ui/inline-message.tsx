import { StyleSheet, Text, View } from 'react-native';
import { colors, radii, spacing, typography } from '../../lib/styles';

export type InlineMessageTone = 'error' | 'success' | 'warning';

export type InlineMessageProps = {
  message: string;
  tone: InlineMessageTone;
};

const toneStyles = {
  error: {
    backgroundColor: colors.dangerSoft,
    borderColor: colors.danger,
    textColor: colors.dangerText,
  },
  success: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
    textColor: colors.primaryText,
  },
  warning: {
    backgroundColor: colors.warningSoft,
    borderColor: colors.warning,
    textColor: colors.warningText,
  },
} satisfies Record<
  InlineMessageTone,
  Record<'backgroundColor' | 'borderColor' | 'textColor', string>
>;

export function InlineMessage({ message, tone }: InlineMessageProps) {
  const visualTone = toneStyles[tone];

  return (
    <View
      accessible
      accessibilityLiveRegion="polite"
      accessibilityRole="alert"
      style={[
        styles.container,
        {
          backgroundColor: visualTone.backgroundColor,
          borderColor: visualTone.borderColor,
        },
      ]}
      testID="inline-message"
    >
      <Text style={[styles.text, { color: visualTone.textColor }]}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: radii.md,
    borderWidth: 1,
    padding: spacing.md,
  },
  text: {
    ...typography.bodyStrong,
  },
});
