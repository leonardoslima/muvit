import type { ReactNode } from 'react';
import { Pressable, Text } from 'react-native';
import { sharedStyles } from '../../lib/styles';

export type AppButtonProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  trailingIcon?: ReactNode;
  variant?: 'danger' | 'primary' | 'secondary';
};

export function AppButton({
  label,
  onPress,
  disabled = false,
  trailingIcon,
  variant = 'primary',
}: AppButtonProps) {
  const isDanger = variant === 'danger';
  const isSecondary = variant === 'secondary';
  const buttonStyle = isDanger
    ? sharedStyles.dangerButton
    : isSecondary
      ? sharedStyles.secondaryButton
      : sharedStyles.button;
  const buttonTextStyle = isDanger
    ? sharedStyles.dangerButtonText
    : isSecondary
      ? sharedStyles.secondaryButtonText
      : sharedStyles.buttonText;

  return (
    <Pressable
      accessible
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={disabled ? undefined : onPress}
      style={({ pressed }) => [
        buttonStyle,
        disabled ? { opacity: 0.5 } : null,
        pressed && !disabled ? { opacity: 0.8 } : null,
      ]}
    >
      <Text style={buttonTextStyle}>{label}</Text>
      {trailingIcon}
    </Pressable>
  );
}
