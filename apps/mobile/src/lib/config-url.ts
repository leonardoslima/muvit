type RuntimePlatform = 'android' | 'ios' | 'web' | 'windows' | 'macos';

export function resolveApiUrl(
  configuredUrl: string | undefined,
  expoHostUri: string | undefined,
  platform: RuntimePlatform,
  allowDevelopmentFallback = true,
): string {
  let fallbackUrl = configuredUrl;
  if (!fallbackUrl) {
    if (!allowDevelopmentFallback) {
      throw new Error('EXPO_PUBLIC_API_URL é obrigatória em produção.');
    }

    fallbackUrl = 'http://localhost:3333';
  }
  if (platform === 'web') return fallbackUrl;
  if (!isLocalhostUrl(fallbackUrl) || !expoHostUri) return fallbackUrl;

  const host = expoHostUri.split(':')[0];
  if (!host) return fallbackUrl;

  return fallbackUrl.replace('localhost', host).replace('127.0.0.1', host);
}

function isLocalhostUrl(value: string): boolean {
  return value.includes('://localhost') || value.includes('://127.0.0.1');
}
