import { Text, View } from 'react-native';
import { colors, spacing, typography } from '../../lib/styles';

type BrandProps = {
  compact?: boolean;
};

export function Brand({ compact = false }: BrandProps) {
  return (
    <View accessibilityLabel="Muvit" style={{ gap: compact ? 0 : spacing.xs }}>
      <Text
        style={{
          color: colors.ink,
          ...(compact ? typography.brandCompact : typography.brand),
        }}
      >
        muvit
      </Text>
      {compact ? null : (
        <Text
          style={{
            color: colors.muted,
            ...typography.brandTagline,
          }}
        >
          movimento que transforma
        </Text>
      )}
    </View>
  );
}
