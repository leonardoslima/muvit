import { Feather } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, fontFamilies, radii, sharedStyles, spacing } from '../../lib/styles';
import { Card } from '../ui/card';

export type TrainerMetricCardProps = {
  label: string;
  value: number;
  description?: string;
  icon?: ComponentProps<typeof Feather>['name'];
  iconBackgroundColor?: string;
  iconColor?: string;
  testID?: string;
};

export function TrainerMetricCard({
  description,
  icon,
  iconBackgroundColor = colors.primarySoft,
  iconColor = colors.primary,
  label,
  testID,
  value,
}: TrainerMetricCardProps) {
  return (
    <Card style={styles.card} testID={testID}>
      <View style={styles.header}>
        {icon ? (
          <View
            style={[styles.iconContainer, { backgroundColor: iconBackgroundColor }]}
            testID={testID ? `${testID}-icon` : undefined}
          >
            <Feather color={iconColor} name={icon} size={17} />
          </View>
        ) : null}
        <Text style={[sharedStyles.label, styles.label]}>{label}</Text>
      </View>
      <Text style={styles.value}>{value}</Text>
      {description ? <Text style={styles.description}>{description}</Text> : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radii.md,
    flex: 1,
    minHeight: 118,
    minWidth: 0,
    padding: 14,
    gap: 6,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    minHeight: 32,
  },
  iconContainer: {
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: radii.pill,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  label: {
    color: colors.muted,
    flex: 1,
    fontFamily: fontFamilies.bodyStrong,
    fontSize: 12,
    fontWeight: '600',
  },
  value: {
    color: colors.ink,
    fontFamily: fontFamilies.heading,
    fontSize: 26,
    fontWeight: '700',
  },
  description: {
    color: colors.primaryText,
    fontFamily: fontFamilies.bodyStrong,
    fontSize: 11,
  },
});
