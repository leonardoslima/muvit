import { type StyleProp, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { radii, spacing, typography } from '../../lib/styles';

export type StatusBadgeProps = {
  backgroundColor: string;
  borderColor?: string;
  label: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  textColor: string;
};

export function StatusBadge({
  backgroundColor,
  borderColor,
  label,
  style,
  testID,
  textColor,
}: StatusBadgeProps) {
  return (
    <View
      style={[
        styles.container,
        style,
        {
          backgroundColor,
          borderColor,
          borderWidth: borderColor ? 1 : 0,
        },
      ]}
      testID={testID}
    >
      <Text style={[styles.text, { color: textColor }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  text: {
    ...typography.labelCompact,
  },
});
