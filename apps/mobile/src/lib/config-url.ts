type RuntimePlatform = 'android' | 'ios' | 'web' | 'windows' | 'macos';

export function resolveApiUrl(
  configuredUrl: string | undefined,
  expoHostUri: string | undefined,
  platform: RuntimePlatform,
): string {
  const fallbackUrl = configuredUrl ?? 'http://localhost:3333';
  if (platform === 'web') return fallbackUrl;
  if (!isLocalhostUrl(fallbackUrl) || !expoHostUri) return fallbackUrl;

  const host = expoHostUri.split(':')[0];
  if (!host) return fallbackUrl;

  return fallbackUrl.replace('localhost', host).replace('127.0.0.1', host);
}

function isLocalhostUrl(value: string): boolean {
  return value.includes('://localhost') || value.includes('://127.0.0.1');
}
