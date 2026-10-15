import { View } from 'react-native';
import type { TrainerWorkoutPlan } from '../../application/workouts/trainer-workout-data';
import { muscleGroupLabel } from '../../lib/muscle-groups';
import { Card } from '../ui/v2/card';
import { Text } from '../ui/v2/text';

export type WorkoutDayCardProps = {
  day: TrainerWorkoutPlan['days'][number];
};

export function WorkoutDayCard({ day }: WorkoutDayCardProps) {
  return (
    <Card>
      <Text variant="sectionTitle">{day.label}</Text>

      {day.exercises.map((item) => (
        <View key={item.id} className="gap-1 border-t border-v2-border pt-3">
          <Text variant="label">{item.exercise.name}</Text>
          <Text className="text-v2-secondary" variant="support">
            {muscleGroupLabel(item.exercise.muscleGroup)}
          </Text>
          <Text className="text-v2-secondary" variant="support">
            {item.sets} séries · {item.reps} reps
          </Text>
          {item.loadKg == null ? null : <LoadLabel value={item.loadKg} />}
          {item.restSeconds == null ? null : (
            <Text className="text-v2-secondary" variant="support">
              Descanso: {item.restSeconds}s
            </Text>
          )}
          {item.notes?.trim() ? (
            <Text className="text-v2-secondary" variant="support">
              {item.notes}
            </Text>
          ) : null}
        </View>
      ))}
    </Card>
  );
}

function LoadLabel({ value }: { value: string | number }) {
  const formattedLoad = formatDecimal(value);
  if (!formattedLoad) return null;

  return (
    <Text className="text-v2-secondary" variant="support">
      Carga: {formattedLoad} kg
    </Text>
  );
}

function formatDecimal(value: string | number): string | undefined {
  const normalized = typeof value === 'string' ? value.trim() : value;
  if (normalized === '') return undefined;

  const number = typeof normalized === 'number' ? normalized : Number(normalized);
  if (!Number.isFinite(number)) return undefined;
  return number.toLocaleString('pt-BR', { maximumFractionDigits: 2 });
}
