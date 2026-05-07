import { isNull } from 'drizzle-orm';
import { db, queryClient, schema } from './index.js';
import { globalExercises } from './seeds/exercises.js';

async function main() {
  await db.delete(schema.exercises).where(isNull(schema.exercises.trainerId));
  await db
    .insert(schema.exercises)
    .values(globalExercises.map((e) => ({ ...e, trainerId: null })))
    .onConflictDoNothing();
  console.log(`seeded ${globalExercises.length} global exercises`);
  await queryClient.end();
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
