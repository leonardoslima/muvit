import { randomBytes, timingSafeEqual } from 'node:crypto';
import { createServer } from 'node:http';

export async function createMailbox() {
  const secret = randomBytes(32).toString('hex');
  const messages = new Map();
  const server = createServer(async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    const supplied = Buffer.from(req.headers.authorization ?? '');
    const expected = Buffer.from(`Bearer ${secret}`);
    if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) {
      res.writeHead(403).end();
      return;
    }
    if (req.method !== 'POST' || req.url !== '/message') {
      res.writeHead(404).end();
      return;
    }
    let body = '';
    for await (const chunk of req) {
      body += chunk;
      if (body.length > 2048) {
        res.writeHead(413).end();
        return;
      }
    }
    let email;
    try {
      email = JSON.parse(body).email;
    } catch {
      res.writeHead(400).end();
      return;
    }
    const url = messages.get(email);
    if (!url) {
      res.writeHead(404).end();
      return;
    }
    messages.delete(email);
    res.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify({ url }));
  });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  return {
    secret,
    url: `http://127.0.0.1:${server.address().port}`,
    take(email) {
      const url = messages.get(email);
      messages.delete(email);
      return url;
    },
    deliver(message) {
      if (typeof message?.user?.email !== 'string' || typeof message.url !== 'string')
        throw new Error('Mensagem inválida');
      messages.set(message.user.email, message.url);
    },
    close: () =>
      new Promise((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      ),
  };
}
