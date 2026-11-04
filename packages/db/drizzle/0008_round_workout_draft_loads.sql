WITH normalized_drafts AS (
  SELECT draft.id,
    jsonb_set(draft.payload, '{days}', (
      SELECT COALESCE(jsonb_agg(
        CASE WHEN jsonb_typeof(day.value -> 'exercises') = 'array' THEN
          jsonb_set(day.value, '{exercises}', (
            SELECT COALESCE(jsonb_agg(
              CASE WHEN jsonb_typeof(exercise.value -> 'loadKg') = 'number' THEN
                jsonb_set(exercise.value, '{loadKg}', to_jsonb(round((exercise.value ->> 'loadKg')::numeric)), false)
              ELSE exercise.value END
              ORDER BY exercise.ordinality
            ), '[]'::jsonb)
            FROM jsonb_array_elements(day.value -> 'exercises') WITH ORDINALITY AS exercise(value, ordinality)
          ), false)
        ELSE day.value END
        ORDER BY day.ordinality
      ), '[]'::jsonb)
      FROM jsonb_array_elements(draft.payload -> 'days') WITH ORDINALITY AS day(value, ordinality)
    ), false) AS payload
  FROM workout_plan_drafts AS draft
  WHERE jsonb_typeof(draft.payload -> 'days') = 'array'
)
UPDATE workout_plan_drafts AS draft
SET payload = normalized.payload,
    revision = draft.revision + 1,
    updated_at = now()
FROM normalized_drafts AS normalized
WHERE draft.id = normalized.id
  AND draft.payload IS DISTINCT FROM normalized.payload;
