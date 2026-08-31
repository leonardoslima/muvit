import { StyleSheet } from 'react-native';

export const colors = {
  background: '#F5F3EF',
  surface: '#FFFFFF',
  ink: '#1A1A1A',
  muted: '#666666',
  line: '#D1CCC4',
  primary: '#2ECC71',
  danger: '#E74C3C',
  warning: '#F39C12',
  primarySoft: '#E9F9F0',
  dangerSoft: '#E74C3C18',
  warningSoft: '#F39C1218',
  primaryText: '#167A45',
  dangerText: '#B42318',
  warningText: '#8A4B00',
  scrim: '#00000040',
  surfaceTranslucent: '#FFFFFFB3',
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
  control: 8,
  sheet: 28,
  handle: 2,
  avatar: 36,
  pill: 999,
};

export const fontFamilies = {
  body: 'Inter_400Regular',
  bodyStrong: 'Inter_600SemiBold',
  heading: 'SpaceGrotesk_600SemiBold',
};

export const controlSizes = {
  touchTarget: 44,
  input: 48,
  authInput: 50,
  button: 48,
  tabBar: 64,
  progressTrack: 8,
  sheetHandleWidth: 44,
  sheetHandleHeight: 4,
  brandMark: 42,
  avatar: 72,
};

export const typography = {
  display: {
    fontFamily: fontFamilies.heading,
    fontSize: 32,
  },
  headline: {
    fontFamily: fontFamilies.heading,
    fontSize: 28,
  },
  title: {
    fontFamily: fontFamilies.heading,
    fontSize: 22,
  },
  subtitle: {
    fontFamily: fontFamilies.body,
    fontSize: 15,
    lineHeight: 22,
  },
  body: {
    fontFamily: fontFamilies.body,
    fontSize: 15,
    lineHeight: 22,
  },
  bodyStrong: {
    fontFamily: fontFamilies.bodyStrong,
    fontSize: 14,
  },
  label: {
    fontFamily: fontFamilies.bodyStrong,
    fontSize: 14,
  },
  labelCompact: {
    fontFamily: fontFamilies.bodyStrong,
    fontSize: 13,
  },
  caption: {
    fontFamily: fontFamilies.body,
    fontSize: 12,
  },
  input: {
    fontFamily: fontFamilies.body,
    fontSize: 14,
  },
  brand: {
    fontFamily: fontFamilies.heading,
    fontSize: 32,
  },
  brandCompact: {
    fontFamily: fontFamilies.heading,
    fontSize: 24,
  },
  brandTagline: {
    fontFamily: fontFamilies.bodyStrong,
    fontSize: 9,
  },
  button: {
    fontFamily: fontFamilies.bodyStrong,
    fontSize: 16,
  },
  cardTitle: {
    fontFamily: fontFamilies.bodyStrong,
    fontSize: 16,
  },
  exerciseTitle: {
    fontFamily: fontFamilies.heading,
    fontSize: 18,
  },
  sheetTitle: {
    fontFamily: fontFamilies.heading,
    fontSize: 26,
  },
  sessionTitle: {
    fontFamily: fontFamilies.heading,
    fontSize: 24,
  },
  timer: {
    fontFamily: fontFamilies.heading,
    fontSize: 48,
  },
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
    color: colors.primaryText,
    ...typography.caption,
    fontFamily: fontFamilies.bodyStrong,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  title: {
    color: colors.ink,
    ...typography.headline,
  },
  subtitle: {
    color: colors.muted,
    ...typography.subtitle,
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
    minHeight: controlSizes.input,
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
    minHeight: controlSizes.button,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
  },
  secondaryButton: {
    alignItems: 'center',
    justifyContent: 'center',
    borderColor: colors.line,
    borderRadius: radii.pill,
    borderWidth: 1,
    minHeight: controlSizes.button,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.xl,
  },
  buttonText: {
    color: colors.ink,
    ...typography.button,
  },
  secondaryButtonText: {
    color: colors.ink,
    ...typography.button,
  },
  error: {
    color: colors.dangerText,
    ...typography.bodyStrong,
  },
  statePanel: {
    alignItems: 'center',
    gap: spacing.md,
    justifyContent: 'center',
    padding: spacing.xxl,
  },
  stateTitle: {
    color: colors.ink,
    ...typography.title,
    textAlign: 'center',
  },
  stateDescription: {
    color: colors.muted,
    ...typography.subtitle,
    textAlign: 'center',
  },
});
