import { Link } from 'expo-router';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import { spacing } from '../../lib/design-system/tokens';
import { Screen } from '../ui/screen';
import { Button, Header, Text } from '../ui/v2';
import { AuthBrand } from './auth-brand';

export function AuthRecoveryLayout({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <Screen scroll contentContainerStyle={{ flexGrow: 1, gap: spacing.xxl, padding: spacing.xxl }}>
      <AuthBrand />
      <View style={{ gap: spacing.sm }}>
        <Header title={title} titleClassName="text-[29px] leading-[40.6px] font-v2-extrabold" />
        <Text className="text-v2-secondary">{description}</Text>
      </View>
      {children}
      <Link href="/(auth)/login" asChild>
        <Button label="Voltar para entrar" onPress={() => undefined} variant="secondary" />
      </Link>
    </Screen>
  );
}
