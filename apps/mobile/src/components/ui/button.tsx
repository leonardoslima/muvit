import { Pressable, Text } from 'react-native';
import { sharedStyles } from '../../lib/styles';

export type AppButtonProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary';
};

export function AppButton({
  label,
  onPress,
  disabled = false,
  variant = 'primary',
}: AppButtonProps) {
  const isSecondary = variant === 'secondary';

  return (
    <Pressable
      accessible
      accessibilityLabel={label}
      accessibilityRole="button"
      disabled={disabled}
      onPress={disabled ? undefined : onPress}
      style={({ pressed }) => [
        isSecondary ? sharedStyles.secondaryButton : sharedStyles.button,
        disabled ? { opacity: 0.5 } : null,
        pressed && !disabled ? { opacity: 0.8 } : null,
      ]}
    >
      <Text style={isSecondary ? sharedStyles.secondaryButtonText : sharedStyles.buttonText}>
        {label}
      </Text>
    </Pressable>
  );
}
