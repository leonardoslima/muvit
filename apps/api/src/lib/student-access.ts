import { db, schema } from '@muvit/db';
import { eq } from 'drizzle-orm';
import type { FastifyReply, FastifyRequest } from 'fastify';

/**
 * Loads a student by id and verifies the requester is allowed to access them.
 * - trainer: must own the student (trainerId === sub) — otherwise 404 (don't leak existence).
 * - student: must be the same id — otherwise 404.
 * Returns the student row, or null after sending the 404. Caller should `if (!student) return;`.
 */
export async function loadAccessibleStudent(
  req: FastifyRequest,
  reply: FastifyReply,
  studentId: string,
) {
  const s = await db.query.students.findFirst({ where: eq(schema.students.id, studentId) });
  if (!s) {
    reply.code(404).send({ error: 'not found' });
    return null;
  }
  if (req.user.role === 'trainer' && s.trainerId !== req.user.sub) {
    reply.code(404).send({ error: 'not found' });
    return null;
  }
  if (req.user.role === 'student' && s.id !== req.user.sub) {
    reply.code(404).send({ error: 'not found' });
    return null;
  }
  return s;
}
