import { type StyleProp, View, type ViewProps, type ViewStyle } from 'react-native';
import { sharedStyles } from '../../lib/styles';

export type CardProps = ViewProps & {
  children: NonNullable<ViewProps['children']>;
  style?: StyleProp<ViewStyle>;
};

export function Card({ children, style, ...props }: CardProps) {
  return (
    <View {...props} style={[sharedStyles.card, style]}>
      {children}
    </View>
  );
}
