import type { JSX } from 'react';
import { View } from 'react-native';
import { colors, fontFamilies, penTokens, spacing } from '../../lib/design-system/tokens';
import { Text } from '../ui/v2/text';

export function AuthBrand(): JSX.Element {
  return (
    <View
      accessible
      accessibilityLabel="Muvit"
      style={{
        minHeight: 54,
        flexDirection: 'row',
        alignItems: 'flex-start',
        paddingLeft: spacing.optical,
        paddingTop: spacing.sm,
      }}
    >
      <Text
        variant="sectionTitle"
        style={{
          color: colors.text,
          fontFamily: fontFamilies.extrabold,
          fontSize: penTokens['font/size/22'],
          lineHeight: 30,
          includeFontPadding: false,
        }}
      >
        muvit
      </Text>
      <View
        accessible={false}
        accessibilityElementsHidden
        importantForAccessibility="no"
        style={{
          width: 7,
          height: 7,
          marginLeft: spacing.xs,
          marginTop: spacing.lg,
          borderRadius: penTokens['radius/4'],
          backgroundColor: colors.primary,
        }}
      />
    </View>
  );
}
