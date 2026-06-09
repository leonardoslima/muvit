type PermissionStatus = 'granted' | 'denied' | 'undetermined';

export type PushTokenApiClient = {
  request: (path: string, init?: RequestInit) => Promise<unknown>;
};

type PushTokenDependencies = {
  api: PushTokenApiClient;
  getPermissions: () => Promise<{ status: PermissionStatus }>;
  requestPermissions: () => Promise<{ status: PermissionStatus }>;
  getExpoPushToken: () => Promise<{ data: string }>;
};

export async function registerPushToken({
  api,
  getPermissions,
  requestPermissions,
  getExpoPushToken,
}: PushTokenDependencies): Promise<void> {
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
