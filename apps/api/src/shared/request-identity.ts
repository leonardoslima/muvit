export type RequestIdentity = {
  authUserId: string;
  profileId: string;
  role: 'trainer' | 'student';
};

declare module 'fastify' {
  interface FastifyRequest {
    identity: RequestIdentity;
  }
}
