import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createMailbox } from './e2e-mailbox.mjs';

test('entrega isolada por credencial e endereço, sem consumir mensagens de outra conta', async () => {
  const mailbox = await createMailbox();
  try {
    mailbox.deliver({
      user: { email: 'a@example.invalid' },
      url: 'http://localhost/verify#token=secret',
    });
    const fetchMessage = (secret, email) =>
      fetch(`${mailbox.url}/message`, {
        method: 'POST',
        headers: { authorization: `Bearer ${secret}`, 'content-type': 'application/json' },
        body: JSON.stringify({ email }),
      });
    assert.equal((await fetchMessage('errado', 'a@example.invalid')).status, 403);
    assert.equal((await fetchMessage(mailbox.secret, 'b@example.invalid')).status, 404);
    const response = await fetchMessage(mailbox.secret, 'a@example.invalid');
    assert.equal((await response.json()).url, 'http://localhost/verify#token=secret');
    assert.equal((await fetchMessage(mailbox.secret, 'a@example.invalid')).status, 404);
  } finally {
    await mailbox.close();
  }
});
