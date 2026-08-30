import {
  type StyleProp,
  Text,
  TextInput,
  type TextInputProps,
  View,
  type ViewStyle,
} from 'react-native';
import { colors, sharedStyles, spacing } from '../../lib/styles';

export type FieldProps = Omit<TextInputProps, 'onChangeText' | 'value'> & {
  label: string;
  onChangeText: (text: string) => void;
  value: string;
  unit?: string;
  error?: string;
  containerStyle?: StyleProp<ViewStyle>;
};

export function Field({
  containerStyle,
  error,
  label,
  onChangeText,
  unit,
  value,
  ...inputProps
}: FieldProps) {
  return (
    <View style={[sharedStyles.field, containerStyle]}>
      <Text style={sharedStyles.label}>{label}</Text>
      <View style={{ alignItems: 'center', flexDirection: 'row', gap: spacing.sm }}>
        <TextInput
          {...inputProps}
          accessibilityLabel={label}
          onChangeText={onChangeText}
          style={[sharedStyles.input, unit ? sharedStyles.inputWithUnit : null]}
          value={value}
        />
        {unit ? <Text style={sharedStyles.unit}>{unit}</Text> : null}
      </View>
      {error ? (
        <Text accessibilityLiveRegion="polite" style={{ color: colors.danger, fontSize: 14 }}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}
