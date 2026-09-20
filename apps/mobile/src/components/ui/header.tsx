import type { ReactNode } from 'react';
import { Pressable, type StyleProp, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import {
  colors,
  controlSizes,
  fontFamilies,
  radii,
  sharedStyles,
  spacing,
  typography,
} from '../../lib/styles';

export type HeaderActionProps = {
  accessibilityLabel: string;
  children: ReactNode;
  disabled?: boolean;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

export function HeaderAction({
  accessibilityLabel,
  children,
  disabled = false,
  onPress,
  style,
  testID,
}: HeaderActionProps) {
  return (
    <Pressable
      accessible
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={disabled ? undefined : onPress}
      style={({ pressed }) => [
        styles.action,
        style,
        disabled ? styles.disabledAction : null,
        pressed && !disabled ? styles.pressedAction : null,
      ]}
      testID={testID}
    >
      {children}
    </Pressable>
  );
}

export type HeaderBackButtonProps = {
  accessibilityLabel?: string;
  children: ReactNode;
  disabled?: boolean;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

export function HeaderBackButton({
  accessibilityLabel = 'Voltar',
  children,
  disabled = false,
  onPress,
  style,
  testID,
}: HeaderBackButtonProps) {
  return (
    <HeaderAction
      accessibilityLabel={accessibilityLabel}
      disabled={disabled}
      onPress={onPress}
      style={[styles.backAction, style]}
      testID={testID}
    >
      {children}
    </HeaderAction>
  );
}

export type PageHeaderProps = {
  action?: ReactNode;
  centered?: boolean;
  eyebrow?: string;
  subtitle?: string;
  testID?: string;
  title: string;
};

export function PageHeader({
  action,
  centered = false,
  eyebrow,
  subtitle,
  testID,
  title,
}: PageHeaderProps) {
  const textStyle = centered ? styles.centeredHeaderText : null;

  return (
    <View
      style={[sharedStyles.header, action ? styles.pageHeaderWithAction : null]}
      testID={testID}
    >
      <View style={action ? styles.pageHeaderCopy : null}>
        {eyebrow ? <Text style={[sharedStyles.eyebrow, textStyle]}>{eyebrow}</Text> : null}
        <Text accessibilityRole="header" style={[sharedStyles.title, textStyle]}>
          {title}
        </Text>
        {subtitle ? <Text style={[sharedStyles.subtitle, textStyle]}>{subtitle}</Text> : null}
      </View>
      {action ? <View style={styles.pageHeaderAction}>{action}</View> : null}
    </View>
  );
}

export type ContextualHeaderProps = {
  action?: ReactNode;
  backAccessibilityLabel?: string;
  backDisabled?: boolean;
  backIcon: ReactNode;
  backTestID?: string;
  eyebrow?: string;
  onBack: () => void;
  subtitle?: string;
  testID?: string;
  title: string;
  titleTestID?: string;
};

export function ContextualHeader({
  action,
  backAccessibilityLabel = 'Voltar',
  backDisabled = false,
  backIcon,
  backTestID,
  eyebrow,
  onBack,
  subtitle,
  testID,
  title,
  titleTestID,
}: ContextualHeaderProps) {
  return (
    <View style={styles.contextualHeader} testID={testID}>
      <View style={styles.contextualLead}>
        <HeaderBackButton
          accessibilityLabel={backAccessibilityLabel}
          disabled={backDisabled}
          onPress={onBack}
          testID={backTestID}
        >
          {backIcon}
        </HeaderBackButton>
        <View style={styles.contextualCopy}>
          {eyebrow ? <Text style={sharedStyles.eyebrow}>{eyebrow}</Text> : null}
          <Text accessibilityRole="header" style={styles.contextualTitle} testID={titleTestID}>
            {title}
          </Text>
          {subtitle ? <Text style={sharedStyles.subtitle}>{subtitle}</Text> : null}
        </View>
      </View>
      {action ? <View style={styles.contextualAction}>{action}</View> : null}
    </View>
  );
}

export type SessionHeaderProps = {
  backTestID?: string;
  backIcon: ReactNode;
  disabled: boolean;
  onBack: () => void;
  showBack: boolean;
  testID?: string;
  title: string;
  titleTestID?: string;
};

export function SessionHeader({
  backTestID,
  backIcon,
  disabled,
  onBack,
  showBack,
  testID,
  title,
  titleTestID,
}: SessionHeaderProps) {
  return (
    <View style={styles.sessionHeader} testID={testID}>
      <Text accessibilityRole="header" style={styles.sessionTitle} testID={titleTestID}>
        {title}
      </Text>
      {showBack ? (
        <HeaderBackButton
          disabled={disabled}
          onPress={onBack}
          style={styles.sessionBack}
          testID={backTestID ?? (testID ? `${testID}-back` : undefined)}
        >
          {backIcon}
        </HeaderBackButton>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  action: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: controlSizes.touchTarget,
    minWidth: controlSizes.touchTarget,
    height: controlSizes.touchTarget,
    width: controlSizes.touchTarget,
    padding: spacing.xs,
  },
  backAction: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: radii.pill,
    borderWidth: 1,
  },
  centeredHeaderText: {
    alignSelf: 'stretch',
    textAlign: 'center',
  },
  contextualAction: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  contextualCopy: {
    flex: 1,
    gap: spacing.xs,
    minWidth: 0,
  },
  contextualHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    minHeight: controlSizes.touchTarget,
  },
  contextualLead: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    minWidth: 0,
  },
  contextualTitle: {
    color: colors.ink,
    flexShrink: 1,
    ...typography.title,
  },
  disabledAction: {
    opacity: 0.5,
  },
  pageHeaderAction: {
    marginTop: spacing.md,
  },
  pageHeaderCopy: {
    flex: 1,
    minWidth: 0,
  },
  pageHeaderWithAction: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.md,
  },
  pressedAction: {
    opacity: 0.8,
  },
  sessionBack: {
    left: 0,
    position: 'absolute',
    top: 0,
  },
  sessionHeader: {
    alignItems: 'center',
    minHeight: controlSizes.touchTarget,
    justifyContent: 'center',
    position: 'relative',
  },
  sessionTitle: {
    color: colors.ink,
    fontFamily: fontFamilies.heading,
    fontSize: typography.sessionTitle.fontSize,
    fontWeight: '600',
    paddingHorizontal: controlSizes.touchTarget + spacing.sm,
    textAlign: 'center',
  },
});
