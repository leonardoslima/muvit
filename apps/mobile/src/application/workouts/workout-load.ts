import { workoutExerciseInputSchema } from '@muvit/validators';

export function assertWorkoutLoad(value: string): void {
  if (!value.trim()) return;
  const number = Number(value);
  if (!/^\d+$/.test(value.trim()) || !Number.isInteger(number)) {
    throw new Error('Carga deve ser um número inteiro.');
  }
  if (!workoutExerciseInputSchema.shape.loadKg.safeParse(number).success) {
    throw new Error('Carga deve estar entre 0 e 1000 kg.');
  }
}

// Exclusivo para leitura de registros anteriores ao contrato de cargas inteiras.
export function normalizeLegacyWorkoutLoads(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(normalizeLegacyWorkoutLoads);
  if (typeof value !== 'object' || value === null) return value;
  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => {
      if (key === 'loadKg' && (typeof item === 'number' || typeof item === 'string')) {
        const number = typeof item === 'string' ? Number(item.replace(',', '.')) : item;
        if (String(item).trim() && Number.isFinite(number) && number >= 0 && number <= 1000) {
          return [key, typeof item === 'string' ? String(Math.round(number)) : Math.round(number)];
        }
      }
      return [key, normalizeLegacyWorkoutLoads(item)];
    }),
  );
}
