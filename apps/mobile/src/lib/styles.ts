import { StyleSheet } from 'react-native';

export const colors = {
  background: '#f7f7f2',
  surface: '#ffffff',
  ink: '#18201b',
  muted: '#647067',
  line: '#dfe4dc',
  primary: '#2f6f4e',
  accent: '#d9902f',
  danger: '#b42318',
};

export const sharedStyles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 20,
  },
  title: {
    color: colors.ink,
    fontSize: 28,
    fontWeight: '700',
  },
  subtitle: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 22,
  },
  card: {
    gap: 12,
    borderColor: colors.line,
    borderRadius: 8,
    borderWidth: 1,
    backgroundColor: colors.surface,
    padding: 16,
  },
  input: {
    borderColor: colors.line,
    borderRadius: 8,
    borderWidth: 1,
    backgroundColor: colors.surface,
    color: colors.ink,
    minHeight: 48,
    paddingHorizontal: 14,
  },
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    minHeight: 48,
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
  },
  secondaryButton: {
    alignItems: 'center',
    justifyContent: 'center',
    borderColor: colors.line,
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 48,
    backgroundColor: colors.surface,
    paddingHorizontal: 16,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryButtonText: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: '700',
  },
  error: {
    color: colors.danger,
    fontSize: 14,
  },
});
