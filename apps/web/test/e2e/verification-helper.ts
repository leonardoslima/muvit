export async function confirmFixtureEmail(
  mail: () => Promise<string>,
  verify: (token: string) => Promise<boolean>,
  origin: string,
  apiOrigin: string,
): Promise<void> {
  const url = new URL(await mail());
  const webLink = url.origin === new URL(origin).origin && url.pathname === '/verify-email';
  const apiLink =
    url.origin === new URL(apiOrigin).origin && url.pathname === '/api/auth/verify-email';
  if (!webLink && !apiLink) {
    throw new Error('Link de confirmação da fixture inválido');
  }
  const token = webLink
    ? new URLSearchParams(url.hash.slice(1)).get('token')
    : url.searchParams.get('token');
  if (!token || !(await verify(token))) throw new Error('Confirmação da fixture falhou');
}

export async function receiveVerificationLink(email: string): Promise<string> {
  const mailbox = process.env.WEB_E2E_MAILBOX_URL;
  const secret = process.env.WEB_E2E_MAILBOX_SECRET;
  if (!mailbox || !secret || new URL(mailbox).hostname !== '127.0.0.1') {
    throw new Error('Mailbox E2E indisponível');
  }
  for (let attempt = 0; attempt < 50; attempt++) {
    const response = await fetch(`${mailbox}/message`, {
      method: 'POST',
      headers: { authorization: `Bearer ${secret}`, 'content-type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    if (response.ok) {
      const body: unknown = await response.json();
      if (
        typeof body === 'object' &&
        body !== null &&
        'url' in body &&
        typeof body.url === 'string'
      )
        return body.url;
      throw new Error('Mensagem E2E inválida');
    }
    if (response.status !== 404) throw new Error('Consulta à mailbox E2E falhou');
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error('Mensagem de confirmação E2E não recebida');
}
