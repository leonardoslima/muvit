import { Link } from 'expo-router';
import { Activity, ArrowUpRight, Flame } from 'lucide-react-native';
import { Pressable, View } from 'react-native';
import {
  colors,
  controlSizes,
  fontFamilies,
  penTokens,
  spacing,
} from '../../lib/design-system/tokens';
import { useWorkoutEvolution } from '../../lib/use-workout-evolution';
import { Card } from '../ui/v2/card';
import { Message } from '../ui/v2/message';
import { Text } from '../ui/v2/text';

export function StudentWorkoutEvolution() {
  const query = useWorkoutEvolution();
  const value = (amount: number | undefined): string =>
    amount === undefined ? '—' : String(amount).padStart(2, '0');

  return (
    <View style={styles.section}>
      <View style={styles.heading}>
        <Text accessibilityRole="header" style={styles.title} variant="sectionTitle">
          Sua evolução
        </Text>
        <Link asChild href="/progress">
          <Pressable
            accessible
            accessibilityRole="link"
            accessibilityLabel="Ver histórico de evolução"
            style={styles.history}
          >
            <Text className="text-v2-brand text-[12px]" variant="caption">
              Ver histórico
            </Text>
            <ArrowUpRight
              accessible={false}
              color={colors.brand}
              size={penTokens['font/size/14']}
            />
          </Pressable>
        </Link>
      </View>
      <View style={styles.metrics} accessibilityState={{ busy: query.isPending }}>
        <Card className="flex-1 border-0" style={styles.metric}>
          <View style={styles.metricHeading}>
            <Text className="text-v2-secondary text-[10px]" variant="caption">
              SEQUÊNCIA
            </Text>
            <Flame accessible={false} color={colors.brand} size={penTokens['font/size/20']} />
          </View>
          <View style={styles.valueRow}>
            <Text style={styles.value}>{value(query.data?.streakWeeks)}</Text>
            <Text className="text-v2-secondary" variant="support">
              semanas
            </Text>
          </View>
        </Card>
        <Card className="flex-1 border-0 bg-v2-subtle" style={styles.metric}>
          <View style={styles.metricHeading}>
            <Text className="text-v2-secondary text-[10px]" variant="caption">
              NA SEMANA
            </Text>
            <Activity accessible={false} color={colors.brand} size={penTokens['font/size/20']} />
          </View>
          <View style={styles.valueRow}>
            <Text style={styles.value}>{value(query.data?.completedThisWeek)}</Text>
            <Text className="text-v2-secondary" variant="support">
              {query.data?.weeklyGoal != null
                ? `de ${String(query.data.weeklyGoal).padStart(2, '0')} treinos`
                : 'treinos'}
            </Text>
          </View>
        </Card>
      </View>
      {query.isError ? (
        <Message
          variant="error"
          title="Não foi possível atualizar sua evolução"
          description="Tente novamente para consultar seus treinos concluídos."
          action={{
            label: 'Atualizar evolução',
            onPress: () => {
              void query.refetch();
            },
            disabled: query.isFetching,
          }}
        />
      ) : null}
    </View>
  );
}

const styles = {
  section: { gap: spacing.md },
  heading: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: spacing.sm },
  title: { flex: 1 },
  history: {
    minHeight: controlSizes.touch,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: spacing.xs,
  },
  metrics: { flexDirection: 'row' as const, gap: spacing.md },
  metric: { minWidth: 0, minHeight: 118, padding: 14, gap: spacing.sm },
  metricHeading: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    gap: spacing.xs,
    flexWrap: 'wrap' as const,
  },
  valueRow: {
    flexDirection: 'row' as const,
    alignItems: 'baseline' as const,
    flexWrap: 'wrap' as const,
    columnGap: spacing.sm,
    rowGap: spacing.xs,
  },
  value: {
    color: colors.text,
    fontFamily: fontFamilies.extrabold,
    fontSize: penTokens['font/size/31'],
    lineHeight: penTokens['font/size/31'] * 1.2,
  },
};
