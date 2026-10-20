// Base Input adaptada de React Native Reusables; consulte README.md e LICENSE.
import { Search } from 'lucide-react-native';
import { type ReactNode, forwardRef, useState } from 'react';
import { TextInput, type TextInputProps, View } from 'react-native';
import { cn } from '../../../lib/design-system/cn';
import { colors, controlSizes } from '../../../lib/design-system/tokens';
import { Text } from './text';

export type FieldProps = Omit<TextInputProps, 'value' | 'onChangeText' | 'readOnly'> & {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  unit?: string;
  hint?: string;
  error?: string;
  variant?: 'default' | 'immersive';
  size?: 'default' | 'auth';
  kind?: 'default' | 'password' | 'search' | 'numeric';
  disabled?: boolean;
  loading?: boolean;
  readOnly?: boolean;
  className?: string;
  inputClassName?: string;
  controlClassName?: string;
  surfaceClassName?: string;
  labelClassName?: string;
  leading?: ReactNode;
  trailing?: ReactNode;
};

export const Field = forwardRef<TextInput, FieldProps>(function Field(
  {
    label,
    value,
    onChangeText,
    unit,
    hint,
    error,
    variant = 'default',
    size = 'default',
    kind = 'default',
    disabled = false,
    loading = false,
    readOnly = false,
    editable = true,
    className,
    inputClassName,
    controlClassName,
    surfaceClassName,
    labelClassName,
    leading,
    trailing,
    onFocus,
    onBlur,
    onChange,
    showSoftInputOnFocus = true,
    testID,
    accessibilityState,
    ...props
  },
  ref,
) {
  const [focused, setFocused] = useState(false);
  const blocked =
    disabled ||
    loading ||
    !editable ||
    Boolean(accessibilityState?.disabled || props['aria-disabled'] || props['aria-busy']);
  const immersive = variant === 'immersive';
  const focus: NonNullable<TextInputProps['onFocus']> = (event) => {
    setFocused(true);
    onFocus?.(event);
  };
  const blur: NonNullable<TextInputProps['onBlur']> = (event) => {
    setFocused(false);
    onBlur?.(event);
  };
  const controlContent = (
    <>
      <Text variant="label" className={cn(immersive && 'text-v2-sessionSecondary', labelClassName)}>
        {label}
      </Text>
      <View
        testID={testID ? `${testID}-control` : undefined}
        className={cn(
          'flex-row items-center gap-2 rounded-v2-field border px-4',
          size === 'auth' ? 'min-h-[58px]' : 'min-h-[52px]',
          immersive
            ? 'bg-v2-sessionSurface border-v2-sessionBorder'
            : 'bg-v2-surface border-v2-border',
          controlClassName,
          !surfaceClassName && focused && !blocked && 'border-2 border-v2-brand',
          !surfaceClassName && error && 'border-v2-error',
          !surfaceClassName && blocked && 'opacity-50',
        )}
      >
        {leading ??
          (kind === 'search' ? (
            <Search
              size={controlSizes.icon}
              color={immersive ? colors.sessionSecondary : colors.secondary}
              accessible={false}
            />
          ) : null)}
        <TextInput
          {...props}
          ref={ref}
          testID={testID}
          value={value}
          editable={!blocked && !readOnly}
          readOnly={readOnly || blocked}
          showSoftInputOnFocus={readOnly || blocked ? false : showSoftInputOnFocus}
          aria-disabled={blocked}
          aria-busy={loading || accessibilityState?.busy || props['aria-busy']}
          accessibilityLabel={props.accessibilityLabel ?? label}
          accessibilityHint={[
            props.accessibilityHint ?? unit,
            error || (!props.accessibilityHint && hint),
          ]
            .filter(Boolean)
            .join('. ')}
          accessibilityState={{
            ...accessibilityState,
            disabled: blocked,
            busy: loading || accessibilityState?.busy || props['aria-busy'],
          }}
          onFocus={focus}
          onBlur={blur}
          onChangeText={(text: string) => {
            if (!blocked && !readOnly) onChangeText(text);
          }}
          onChange={(event) => {
            if (!blocked && !readOnly) onChange?.(event);
          }}
          secureTextEntry={props.secureTextEntry ?? kind === 'password'}
          keyboardType={props.keyboardType ?? (kind === 'numeric' ? 'decimal-pad' : 'default')}
          returnKeyType={props.returnKeyType ?? (kind === 'search' ? 'search' : 'done')}
          placeholderTextColor={
            props.placeholderTextColor ?? (immersive ? colors.sessionSecondary : colors.secondary)
          }
          selectionColor={
            props.selectionColor ?? (immersive && surfaceClassName ? colors.primary : undefined)
          }
          cursorColor={
            props.cursorColor ?? (immersive && surfaceClassName ? colors.primary : undefined)
          }
          className={cn(
            'min-w-0 flex-1 py-3 font-v2-regular text-[14px] leading-[19.6px]',
            immersive ? 'text-v2-sessionText' : 'text-v2-text',
            inputClassName,
            immersive && surfaceClassName && blocked && 'text-v2-sessionSecondary',
          )}
        />
        {unit && (
          <Text
            variant="support"
            className={immersive ? 'text-v2-sessionSecondary' : 'text-v2-secondary'}
          >
            {unit}
          </Text>
        )}
        {trailing}
      </View>
    </>
  );
  return (
    <View className={cn('gap-2', className)}>
      {surfaceClassName ? (
        <View
          testID={testID ? `${testID}-surface` : undefined}
          className={cn(
            surfaceClassName,
            focused &&
              !blocked &&
              (immersive ? 'border-2 border-v2-primary' : 'border-2 border-v2-brand'),
            error && !blocked && 'border-2 border-v2-error',
          )}
        >
          {controlContent}
        </View>
      ) : (
        controlContent
      )}
      {error ? (
        <Text
          variant="support"
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
          className={immersive && surfaceClassName ? 'text-v2-errorBg' : 'text-v2-error'}
        >
          {error}
        </Text>
      ) : hint ? (
        <Text
          variant="support"
          className={immersive ? 'text-v2-sessionSecondary' : 'text-v2-secondary'}
        >
          {hint}
        </Text>
      ) : null}
    </View>
  );
});
