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
        alignItems: 'center',
        paddingLeft: spacing.optical,
      }}
    >
      <Text
        variant="sectionTitle"
        style={{
          color: colors.text,
          fontFamily: fontFamilies.extrabold,
          fontSize: penTokens['font/size/22'],
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
          borderRadius: penTokens['radius/4'],
          backgroundColor: colors.primary,
        }}
      />
    </View>
  );
}
