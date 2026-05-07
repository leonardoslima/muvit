import type { FastifyInstance } from 'fastify';

export type JwtPayload = { sub: string; role: 'trainer' | 'student' };

export const signAccessToken = (app: FastifyInstance, p: JwtPayload) =>
  app.jwt.sign(p, { expiresIn: '15m' });

export const signRefreshToken = (app: FastifyInstance, p: JwtPayload) =>
  app.jwt.sign({ ...p, kind: 'refresh' }, { expiresIn: '30d' });

export const verifyRefreshToken = async (app: FastifyInstance, token: string) => {
  const decoded = app.jwt.verify<JwtPayload & { kind?: string }>(token);
  if (decoded.kind !== 'refresh') throw new Error('not a refresh token');
  return decoded;
};
