import Constants from 'expo-constants';

type ExpoExtra = {
  apiUrl?: string;
};

const extra = (Constants.expoConfig?.extra ?? {}) as ExpoExtra;

export const config = {
  apiUrl: extra.apiUrl ?? process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3333',
};
