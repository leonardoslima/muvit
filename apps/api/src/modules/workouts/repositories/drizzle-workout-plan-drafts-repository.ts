import { db, schema } from '@muvit/db';
import type { WorkoutPlanDraftRecord } from '@muvit/db/schema';
import {
  type PublishWorkoutPlanDraftInput,
  type SaveWorkoutPlanDraftInput,
  type WorkoutPlanDraft,
  type WorkoutPlanDraftPayload,
  workoutPlanDraftSchema,
} from '@muvit/validators';
import { and, asc, desc, eq, inArray, isNull, ne, or } from 'drizzle-orm';
import { UseCaseError } from '../../../shared/use-case-error.js';
import { replaceWorkoutPlanDays } from './drizzle-workout-plans-repository.js';
import type { WorkoutPlanDraftRepositories } from './workout-plan-drafts-repository.js';
import type { WorkoutPlanFullResponse } from './workout-plans-repository.js';

type WorkoutPlanTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
type WorkoutPlanReadClient = Pick<typeof db, 'select'>;
type WorkoutPlanDraftContext = Pick<
  WorkoutPlanDraftRecord,
  'trainerId' | 'studentId' | 'sourcePlanId'
>;

const withCurrentDaysAndExercises = {
  days: {
    where: eq(schema.workoutDays.isCurrent, true),
    orderBy: [asc(schema.workoutDays.dayOrder)],
    with: {
      exercises: {
        orderBy: [asc(schema.workoutExercises.exerciseOrder)],
        with: { exercise: true as const },
      },
    },
  },
};

function contextWhere(
  trainerId: string,
  input: Pick<SaveWorkoutPlanDraftInput, 'studentId' | 'sourcePlanId'>,
) {
  return and(
    eq(schema.workoutPlanDrafts.trainerId, trainerId),
    eq(schema.workoutPlanDrafts.studentId, input.studentId),
    input.sourcePlanId === undefined
      ? isNull(schema.workoutPlanDrafts.sourcePlanId)
      : eq(schema.workoutPlanDrafts.sourcePlanId, input.sourcePlanId),
  );
}

function exerciseIds(payload: WorkoutPlanDraftPayload) {
  return [
    ...new Set(payload.days.flatMap((day) => day.exercises.map((exercise) => exercise.exerciseId))),
  ];
}

async function findAvailableExerciseReferences(
  client: WorkoutPlanReadClient,
  trainerId: string,
  payload: WorkoutPlanDraftPayload,
) {
  const ids = exerciseIds(payload);
  const rows = ids.length
    ? await client
        .select({
          id: schema.exercises.id,
          name: schema.exercises.name,
          muscleGroup: schema.exercises.muscleGroup,
        })
        .from(schema.exercises)
        .where(
          and(
            inArray(schema.exercises.id, ids),
            or(isNull(schema.exercises.trainerId), eq(schema.exercises.trainerId, trainerId)),
          ),
        )
        .for('key share')
    : [];
  if (rows.length !== ids.length) return null;

  const byId = new Map(rows.map((exercise) => [exercise.id, exercise]));
  return ids.map((id) => byId.get(id)).filter((exercise) => exercise !== undefined);
}

async function assertDraftContext(
  tx: WorkoutPlanTransaction,
  trainerId: string,
  studentId: string,
  sourcePlanId: string | null,
) {
  const [student] = await tx
    .select({ id: schema.students.id })
    .from(schema.students)
    .where(and(eq(schema.students.id, studentId), eq(schema.students.trainerId, trainerId)))
    .for('update')
    .limit(1);
  if (!student) throw new UseCaseError('not_found', 'not found');

  if (!sourcePlanId) return;

  const [sourcePlan] = await tx
    .select({
      id: schema.workoutPlans.id,
      studentId: schema.workoutPlans.studentId,
      trainerId: schema.workoutPlans.trainerId,
      status: schema.workoutPlans.status,
    })
    .from(schema.workoutPlans)
    .where(eq(schema.workoutPlans.id, sourcePlanId))
    .for('update')
    .limit(1);

  if (
    !sourcePlan ||
    sourcePlan.studentId !== studentId ||
    sourcePlan.trainerId !== trainerId ||
    sourcePlan.status === 'archived'
  ) {
    throw new UseCaseError('not_found', 'not found');
  }
}

async function attachExerciseReferences(
  client: WorkoutPlanReadClient,
  trainerId: string,
  drafts: WorkoutPlanDraftRecord[],
): Promise<WorkoutPlanDraft[]> {
  if (drafts.length === 0) return [];

  const sourcePlanIds = drafts.flatMap((draft) =>
    draft.sourcePlanId === null ? [] : [draft.sourcePlanId],
  );
  const sourcePlans = sourcePlanIds.length
    ? await client
        .select({
          id: schema.workoutPlans.id,
          studentId: schema.workoutPlans.studentId,
          trainerId: schema.workoutPlans.trainerId,
          status: schema.workoutPlans.status,
        })
        .from(schema.workoutPlans)
        .where(
          and(
            inArray(schema.workoutPlans.id, sourcePlanIds),
            eq(schema.workoutPlans.trainerId, trainerId),
            ne(schema.workoutPlans.status, 'archived'),
          ),
        )
    : [];
  const sourcesById = new Map(sourcePlans.map((plan) => [plan.id, plan]));

  const ids = [...new Set(drafts.flatMap((draft) => exerciseIds(draft.payload)))];
  const exercises = ids.length
    ? await client
        .select({
          id: schema.exercises.id,
          name: schema.exercises.name,
          muscleGroup: schema.exercises.muscleGroup,
        })
        .from(schema.exercises)
        .where(
          and(
            inArray(schema.exercises.id, ids),
            or(isNull(schema.exercises.trainerId), eq(schema.exercises.trainerId, trainerId)),
          ),
        )
    : [];
  const exercisesById = new Map(exercises.map((exercise) => [exercise.id, exercise]));

  return drafts.flatMap((draft) => {
    const sourcePlan = draft.sourcePlanId ? sourcesById.get(draft.sourcePlanId) : null;
    if (
      draft.sourcePlanId &&
      (!sourcePlan ||
        sourcePlan.studentId !== draft.studentId ||
        sourcePlan.trainerId !== trainerId)
    ) {
      return [];
    }

    const draftExerciseIds = exerciseIds(draft.payload);
    const references = draftExerciseIds.map((id) => exercisesById.get(id));
    if (references.some((exercise) => exercise === undefined)) return [];

    return [
      workoutPlanDraftSchema.parse({
        ...draft,
        exerciseReferences: references,
      }),
    ];
  });
}

function draftResponse(
  draft: WorkoutPlanDraftRecord,
  exerciseReferences: NonNullable<Awaited<ReturnType<typeof findAvailableExerciseReferences>>>,
) {
  return workoutPlanDraftSchema.parse({ ...draft, exerciseReferences });
}

export class DrizzleWorkoutPlanDraftsRepository implements WorkoutPlanDraftRepositories {
  async save(trainerId: string, input: SaveWorkoutPlanDraftInput) {
    return db.transaction(async (tx) => {
      await assertDraftContext(tx, trainerId, input.studentId, input.sourcePlanId ?? null);
      const references = await findAvailableExerciseReferences(tx, trainerId, input.payload);
      if (!references) throw new UseCaseError('not_found', 'not found');

      if (input.draftId !== undefined && input.revision !== undefined) {
        const [updated] = await tx
          .update(schema.workoutPlanDrafts)
          .set({
            payload: input.payload,
            selectedDayOrder: input.selectedDayOrder,
            revision: input.revision + 1,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(schema.workoutPlanDrafts.id, input.draftId),
              contextWhere(trainerId, input),
              eq(schema.workoutPlanDrafts.revision, input.revision),
            ),
          )
          .returning();
        return updated ? draftResponse(updated, references) : null;
      }

      if (input.draftId !== undefined || input.revision !== undefined) return null;

      const [created] = await tx
        .insert(schema.workoutPlanDrafts)
        .values({
          trainerId,
          studentId: input.studentId,
          sourcePlanId: input.sourcePlanId ?? null,
          payload: input.payload,
          selectedDayOrder: input.selectedDayOrder,
          revision: 1,
        })
        .onConflictDoNothing()
        .returning();
      return created ? draftResponse(created, references) : null;
    });
  }

  async listForStudent(trainerId: string, studentId: string) {
    const drafts = await db
      .select()
      .from(schema.workoutPlanDrafts)
      .where(
        and(
          eq(schema.workoutPlanDrafts.trainerId, trainerId),
          eq(schema.workoutPlanDrafts.studentId, studentId),
        ),
      )
      .orderBy(desc(schema.workoutPlanDrafts.updatedAt));
    return attachExerciseReferences(db, trainerId, drafts);
  }

  async findById(trainerId: string, id: string) {
    const draft = await db.query.workoutPlanDrafts.findFirst({
      where: and(
        eq(schema.workoutPlanDrafts.id, id),
        eq(schema.workoutPlanDrafts.trainerId, trainerId),
      ),
    });
    if (!draft) return null;
    const [resolved] = await attachExerciseReferences(db, trainerId, [draft]);
    return resolved ?? null;
  }

  async publish(trainerId: string, id: string, input: PublishWorkoutPlanDraftInput) {
    return db.transaction(async (tx) => {
      const [draftContext] = await tx
        .select({
          studentId: schema.workoutPlanDrafts.studentId,
          sourcePlanId: schema.workoutPlanDrafts.sourcePlanId,
        })
        .from(schema.workoutPlanDrafts)
        .where(
          and(
            eq(schema.workoutPlanDrafts.id, id),
            eq(schema.workoutPlanDrafts.trainerId, trainerId),
          ),
        )
        .limit(1);
      if (!draftContext) return null;

      await assertDraftContext(tx, trainerId, draftContext.studentId, draftContext.sourcePlanId);

      const [draft] = await tx
        .select()
        .from(schema.workoutPlanDrafts)
        .where(
          and(
            eq(schema.workoutPlanDrafts.id, id),
            eq(schema.workoutPlanDrafts.trainerId, trainerId),
          ),
        )
        .for('update')
        .limit(1);
      if (!draft) return null;
      if (
        draft.studentId !== draftContext.studentId ||
        draft.sourcePlanId !== draftContext.sourcePlanId
      ) {
        throw new UseCaseError('conflict', 'conflict');
      }
      if (draft.revision !== input.revision) throw new UseCaseError('conflict', 'conflict');

      const references = await findAvailableExerciseReferences(tx, trainerId, input.payload);
      if (!references) throw new UseCaseError('not_found', 'not found');

      let planId = draft.sourcePlanId;
      if (planId) {
        const [updated] = await tx
          .update(schema.workoutPlans)
          .set({ name: input.payload.name, notes: input.payload.notes ?? null, status: 'active' })
          .where(
            and(
              eq(schema.workoutPlans.id, planId),
              eq(schema.workoutPlans.studentId, draft.studentId),
              eq(schema.workoutPlans.trainerId, trainerId),
              ne(schema.workoutPlans.status, 'archived'),
            ),
          )
          .returning({ id: schema.workoutPlans.id });
        if (!updated) throw new UseCaseError('not_found', 'not found');
        planId = updated.id;
      } else {
        const [created] = await tx
          .insert(schema.workoutPlans)
          .values({
            trainerId,
            studentId: draft.studentId,
            name: input.payload.name,
            notes: input.payload.notes ?? null,
            status: 'active',
          })
          .returning({ id: schema.workoutPlans.id });
        if (!created) throw new Error('insert failed');
        planId = created.id;
      }

      await replaceWorkoutPlanDays(tx, planId, input.payload.days);

      const [consumed] = await tx
        .delete(schema.workoutPlanDrafts)
        .where(
          and(
            eq(schema.workoutPlanDrafts.id, id),
            eq(schema.workoutPlanDrafts.trainerId, trainerId),
            eq(schema.workoutPlanDrafts.revision, input.revision),
          ),
        )
        .returning({ id: schema.workoutPlanDrafts.id });
      if (!consumed) throw new UseCaseError('conflict', 'conflict');

      const plan = await tx.query.workoutPlans.findFirst({
        where: eq(schema.workoutPlans.id, planId),
        with: withCurrentDaysAndExercises,
      });
      if (!plan) throw new Error('find failed');
      return plan as WorkoutPlanFullResponse;
    });
  }
}
