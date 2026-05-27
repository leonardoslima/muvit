import { z } from 'zod';

const schema = z.object({
  DATABASE_URL: z.string().url(),
});

export const dbEnv = schema.parse(process.env);
