type ExpoPushMessage = {
  token: string;
  title: string;
  body: string;
};

export async function sendPush({ token, title, body }: ExpoPushMessage): Promise<void> {
  const response = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ to: token, title, body }),
  });

  if (!response.ok) {
    throw new Error('push notification failed');
  }
}
