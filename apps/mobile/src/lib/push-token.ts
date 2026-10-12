type PermissionStatus = 'granted' | 'denied' | 'undetermined';

// Temporariamente pausado até a configuração do projectId da Expo.
export const PUSH_TOKEN_REGISTRATION_ENABLED = false;

export type PushTokenApiClient = {
  request: (path: string, init?: RequestInit) => Promise<unknown>;
};

type PushTokenDependencies = {
  enabled?: boolean;
  api: PushTokenApiClient;
  getPermissions: () => Promise<{ status: PermissionStatus }>;
  requestPermissions: () => Promise<{ status: PermissionStatus }>;
  getExpoPushToken: () => Promise<{ data: string }>;
};

export async function registerPushToken({
  enabled = PUSH_TOKEN_REGISTRATION_ENABLED,
  api,
  getPermissions,
  requestPermissions,
  getExpoPushToken,
}: PushTokenDependencies): Promise<void> {
  if (!enabled) return;

  const currentPermission = await getPermissions();
  const finalPermission =
    currentPermission.status === 'granted' ? currentPermission : await requestPermissions();

  if (finalPermission.status !== 'granted') return;

  const pushToken = await getExpoPushToken();
  await api.request('/students/me/push-token', {
    method: 'POST',
    body: JSON.stringify({ token: pushToken.data }),
  });
}
