import { z } from 'zod';

const schema = z.object({
  // Preserva o valor original aceito pelo parser de URL.
  DATABASE_URL: z
    .string({ error: (issue) => (issue.input === undefined ? 'Required' : undefined) })
    .refine((value) => URL.canParse(value), { error: 'Invalid url' }),
});

export const dbEnv = schema.parse(process.env);
