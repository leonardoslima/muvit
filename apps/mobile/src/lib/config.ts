import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { resolveApiUrl } from './config-url';

type ExpoExtra = {
  apiUrl?: string;
};

const extra = (Constants.expoConfig?.extra ?? {}) as ExpoExtra;

export const config = {
  apiUrl: resolveApiUrl(
    extra.apiUrl ?? process.env.EXPO_PUBLIC_API_URL,
    readExpoHostUri(),
    Platform.OS,
  ),
};

function readExpoHostUri(): string | undefined {
  const expoConfig = Constants.expoConfig as { hostUri?: unknown } | null;
  if (typeof expoConfig?.hostUri === 'string') return expoConfig.hostUri;

  const expoGoConfig = Constants.expoGoConfig as { debuggerHost?: unknown } | null;
  return typeof expoGoConfig?.debuggerHost === 'string' ? expoGoConfig.debuggerHost : undefined;
}
