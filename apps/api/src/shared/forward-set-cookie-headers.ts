import type { FastifyReply } from 'fastify';

export function forwardSetCookieHeaders(reply: FastifyReply, headers: Headers): void {
  const setCookieHeaders = headers.getSetCookie();
  if (setCookieHeaders.length > 0) reply.header('set-cookie', setCookieHeaders);
}
