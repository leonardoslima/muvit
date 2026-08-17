import { StyleSheet } from 'react-native';

export const colors = {
  background: '#F5F3EF',
  surface: '#FFFFFF',
  ink: '#1A1A1A',
  muted: '#666666',
  line: '#D1CCC4',
  primary: '#2ECC71',
  warning: '#F39C12',
  accent: '#F39C12',
  danger: '#E74C3C',
  primarySoft: '#E9F9F0',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const radii = {
  sm: 6,
  md: 10,
  lg: 14,
  pill: 999,
};

export const fontFamilies = {
  body: 'Inter_400Regular',
  bodyStrong: 'Inter_600SemiBold',
  heading: 'SpaceGrotesk_600SemiBold',
};

export const sharedStyles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  screen: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.xxl,
  },
  header: {
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  eyebrow: {
    color: colors.primary,
    fontFamily: fontFamilies.bodyStrong,
    fontSize: 12,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  title: {
    color: colors.ink,
    fontFamily: fontFamilies.heading,
    fontSize: 28,
  },
  subtitle: {
    color: colors.muted,
    fontFamily: fontFamilies.body,
    fontSize: 15,
    lineHeight: 22,
  },
  card: {
    gap: spacing.md,
    borderColor: colors.line,
    borderRadius: radii.lg,
    borderWidth: 1,
    backgroundColor: colors.surface,
    padding: spacing.lg,
  },
  field: {
    gap: spacing.sm,
  },
  label: {
    color: colors.ink,
    fontFamily: fontFamilies.bodyStrong,
    fontSize: 14,
  },
  input: {
    borderColor: colors.line,
    borderRadius: radii.md,
    borderWidth: 1,
    backgroundColor: colors.surface,
    color: colors.ink,
    fontFamily: fontFamilies.body,
    fontSize: 16,
    minHeight: 48,
    paddingHorizontal: spacing.lg,
  },
  inputWithUnit: {
    flex: 1,
  },
  unit: {
    color: colors.muted,
    fontFamily: fontFamilies.bodyStrong,
    fontSize: 14,
    minWidth: 32,
    textAlign: 'right',
  },
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.pill,
    minHeight: 48,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
  },
  secondaryButton: {
    alignItems: 'center',
    justifyContent: 'center',
    borderColor: colors.line,
    borderRadius: radii.pill,
    borderWidth: 1,
    minHeight: 48,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.xl,
  },
  buttonText: {
    color: colors.ink,
    fontFamily: fontFamilies.bodyStrong,
    fontSize: 16,
  },
  secondaryButtonText: {
    color: colors.ink,
    fontFamily: fontFamilies.bodyStrong,
    fontSize: 16,
  },
  error: {
    color: colors.danger,
    fontFamily: fontFamilies.body,
    fontSize: 14,
  },
  statePanel: {
    alignItems: 'center',
    gap: spacing.md,
    justifyContent: 'center',
    padding: spacing.xxl,
  },
  stateTitle: {
    color: colors.ink,
    fontFamily: fontFamilies.heading,
    fontSize: 22,
    textAlign: 'center',
  },
  stateDescription: {
    color: colors.muted,
    fontFamily: fontFamilies.body,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
});
