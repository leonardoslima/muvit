import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import postgres from 'postgres';
import { dbEnv } from '../src/env.js';

const target = new URL(dbEnv.DATABASE_URL);
assert.ok(
  ['localhost', '127.0.0.1'].includes(target.hostname) && target.port === '5433',
  'A verificação exige o banco de teste local na porta 5433.',
);

const numericMigration = await readFile(
  new URL('../drizzle/0007_useful_mulholland_black.sql', import.meta.url),
  'utf8',
);
const draftMigration = await readFile(
  new URL('../drizzle/0008_round_workout_draft_loads.sql', import.meta.url),
  'utf8',
);
const client = postgres(dbEnv.DATABASE_URL, { max: 1 });
const originalPayload = {
  name: 'Rascunho preservado',
  notes: 'Não alterar',
  extra: { enabled: true },
  days: [
    {
      label: 'Treino B',
      dayOrder: 2,
      exercises: [
        { exerciseId: 'a', loadKg: 12.4, notes: 'Técnica' },
        { exerciseId: 'b', loadKg: 12.5, reps: '8-10' },
        { exerciseId: 'c', loadKg: null },
        { exerciseId: 'd', tempo: '3010' },
        { exerciseId: 'e', loadKg: '12.5' },
      ],
    },
    { label: 'Treino A', dayOrder: 1, exercises: [] },
  ],
};
const expectedPayload = {
  ...originalPayload,
  days: [
    {
      label: 'Treino B',
      dayOrder: 2,
      exercises: [
        { exerciseId: 'a', loadKg: 12, notes: 'Técnica' },
        { exerciseId: 'b', loadKg: 13, reps: '8-10' },
        { exerciseId: 'c', loadKg: null },
        { exerciseId: 'd', tempo: '3010' },
        { exerciseId: 'e', loadKg: '12.5' },
      ],
    },
    { label: 'Treino A', dayOrder: 1, exercises: [] },
  ],
};

try {
  await client.begin(async (transaction) => {
    await transaction.unsafe(`
      CREATE TEMP TABLE log_sets (id integer, load_kg numeric(5,1)) ON COMMIT DROP;
      CREATE TEMP TABLE workout_exercises (id integer, load_kg numeric(5,1)) ON COMMIT DROP;
      CREATE TEMP TABLE workout_plan_drafts (
        id integer PRIMARY KEY, payload jsonb NOT NULL, revision integer NOT NULL,
        updated_at timestamptz NOT NULL
      ) ON COMMIT DROP;
      CREATE TEMP TABLE assessments (weight_kg numeric(5,2)) ON COMMIT DROP;
      INSERT INTO log_sets VALUES (1, 12.4), (2, 12.5), (3, NULL), (4, 9999.9), (5, 0);
      INSERT INTO workout_exercises SELECT * FROM log_sets;
      INSERT INTO assessments VALUES (72.35);
    `);
    const unchangedPayloads = [
      { days: [{ exercises: [{ loadKg: 4 }, { loadKg: null }, {}] }] },
      { days: [] },
      { name: 'Sem dias' },
      { days: null },
    ];
    await transaction`INSERT INTO workout_plan_drafts VALUES
      (1, ${transaction.json(originalPayload)}, 3, '2026-01-01T00:00:00Z')`;
    for (const [index, payload] of unchangedPayloads.entries()) {
      await transaction`INSERT INTO workout_plan_drafts VALUES
        (${index + 2}, ${transaction.json(payload)}, 3, '2026-01-01T00:00:00Z')`;
    }
    await transaction.unsafe(numericMigration);
    await transaction.unsafe(draftMigration);
    for (const table of ['log_sets', 'workout_exercises']) {
      const rows = await transaction.unsafe<{ load_kg: string | null }[]>(
        `SELECT load_kg FROM ${table} ORDER BY id`,
      );
      assert.deepEqual(
        rows.map((row) => row.load_kg),
        ['12', '13', null, '10000', '0'],
      );
    }
    const [assessment] = await transaction`SELECT weight_kg FROM assessments`;
    assert.equal(assessment?.weight_kg, '72.35');
    const rows =
      await transaction`SELECT id, payload, revision, updated_at FROM workout_plan_drafts ORDER BY id`;
    assert.deepEqual(rows[0]?.payload, expectedPayload);
    assert.equal(rows[0]?.revision, 4);
    assert.notEqual(rows[0]?.updated_at.toISOString(), '2026-01-01T00:00:00.000Z');
    for (const [index, payload] of unchangedPayloads.entries()) {
      const row = rows[index + 1];
      assert.deepEqual(row?.payload, payload);
      assert.equal(row?.revision, 3);
      assert.equal(row?.updated_at.toISOString(), '2026-01-01T00:00:00.000Z');
    }
    await transaction.unsafe(draftMigration);
    assert.deepEqual(
      await transaction`SELECT id, payload, revision, updated_at FROM workout_plan_drafts ORDER BY id`,
      rows,
    );
  });
  console.log(
    'Migrations de cargas verificadas em tabelas temporárias: arredondamento, preservação e idempotência.',
  );
} finally {
  await client.end();
}
