import { z } from 'zod';

export const reportRangeSchema = z.enum(['30d', '90d', '6m', 'all', 'custom']);

export const reportQuerySchema = z
  .object({
    range: reportRangeSchema,
    from: z.string().date().optional(),
    to: z.string().date().optional(),
  })
  .superRefine((query, context) => {
    if (query.range === 'custom') {
      if (!query.from) {
        context.addIssue({ code: z.ZodIssueCode.custom, message: 'Informe a data inicial.' });
      }
      if (!query.to) {
        context.addIssue({ code: z.ZodIssueCode.custom, message: 'Informe a data final.' });
      }
      if (query.from && query.to && query.from > query.to) {
        context.addIssue({ code: z.ZodIssueCode.custom, message: 'A data inicial deve anteceder a final.' });
      }
      return;
    }

    if (query.from !== undefined || query.to !== undefined) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Datas explícitas são aceitas apenas para o período personalizado.',
      });
    }
  });

const reportSectionSchema = z.object({ hasEnoughData: z.boolean() });

export const studentReportSchema = z.object({
  student: z.object({
    id: z.string().uuid(),
    name: z.string(),
    avatarUrl: z.string().url().nullable(),
  }),
  period: z.object({
    range: reportRangeSchema,
    from: z.string().date().nullable(),
    to: z.string().date().nullable(),
  }),
  physicalEvolution: reportSectionSchema.extend({
    points: z.array(
      z.object({
        date: z.string().date(),
        weightKg: z.number().nullable(),
        bodyFatPct: z.number().nullable(),
        measurements: z.record(z.number()).nullable(),
      }),
    ),
    changes: z.object({
      weightKg: z.number().nullable(),
      bodyFatPct: z.number().nullable(),
      waistCm: z.number().nullable(),
      armCm: z.number().nullable(),
    }),
  }),
  beforeAfter: reportSectionSchema.extend({
    before: z.object({ date: z.string().date(), photoUrl: z.string().url().nullable() }).nullable(),
    after: z.object({ date: z.string().date(), photoUrl: z.string().url().nullable() }).nullable(),
  }),
  workoutAdherence: reportSectionSchema.extend({
    completed: z.number().int().min(0),
    planned: z.number().int().min(0),
    percentage: z.number().nullable(),
  }),
  trainingFrequency: reportSectionSchema.extend({
    days: z.array(z.object({ date: z.string().date(), count: z.number().int().min(0) })),
  }),
  topExercises: reportSectionSchema.extend({
    items: z.array(
      z.object({
        exerciseId: z.string().uuid(),
        name: z.string(),
        maxLoadKg: z.number().nullable(),
        totalSets: z.number().int().min(0),
        progression: z.array(z.object({ date: z.string().date(), loadKg: z.number() })),
      }),
    ),
  }),
  rpeTrend: reportSectionSchema.extend({
    points: z.array(z.object({ date: z.string().date(), averageRpe: z.number() })),
  }),
  summary: z.string(),
});

export type ReportQuery = z.infer<typeof reportQuerySchema>;
export type StudentReport = z.infer<typeof studentReportSchema>;
