import { Text, View } from 'react-native';
import { colors, fontFamilies, spacing } from '../../lib/styles';

type BrandProps = {
  compact?: boolean;
};

export function Brand({ compact = false }: BrandProps) {
  return (
    <View accessibilityLabel="Muvit" style={{ gap: compact ? 0 : spacing.xs }}>
      <Text
        style={{
          color: colors.ink,
          fontFamily: fontFamilies.heading,
          fontSize: compact ? 24 : 32,
        }}
      >
        muvit
      </Text>
      {compact ? null : (
        <Text
          style={{
            color: colors.muted,
            fontFamily: fontFamilies.body,
            fontSize: 13,
          }}
        >
          movimento que transforma
        </Text>
      )}
    </View>
  );
}
