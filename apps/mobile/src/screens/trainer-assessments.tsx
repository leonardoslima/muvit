import { Ionicons } from '@expo/vector-icons';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  type AssessmentsPage,
  TRAINER_ASSESSMENTS_PAGE_SIZE,
  listAssessments,
} from '../application/assessments/assessment-data';
import type { TrainerStudent } from '../application/trainer/trainer-data';
import { AssessmentListItem } from '../components/assessments/assessment-list-item';
import { AppButton } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { InlineMessage } from '../components/ui/inline-message';
import { Screen } from '../components/ui/screen';
import { StatePanel } from '../components/ui/state-panel';
import { ApiError } from '../lib/api';
import { colors, radii, spacing, typography } from '../lib/styles';
import { useApiClient } from '../lib/use-api';

export function TrainerAssessmentsScreen() {
  const api = useApiClient();
  const queryClient = useQueryClient();
  const params = useLocalSearchParams<{ studentId?: string | string[] }>();
  const studentId = Array.isArray(params.studentId) ? params.studentId[0] : params.studentId;
  const student = studentId
    ? queryClient.getQueryData<Pick<TrainerStudent, 'name'>>(['trainer', 'student', studentId])
    : undefined;
  const studentName = student?.name.trim() || undefined;
  const query = useInfiniteQuery({
    enabled: Boolean(studentId),
    queryKey: ['trainer', 'assessments', studentId],
    initialPageParam: 0,
    queryFn: ({ pageParam, signal }) => {
      if (!studentId) throw new Error('Aluno inválido.');

      return listAssessments(
        api,
        { kind: 'student', studentId },
        {
          limit: TRAINER_ASSESSMENTS_PAGE_SIZE,
          offset: pageParam,
          signal,
        },
      );
    },
    getNextPageParam: (lastPage: AssessmentsPage, pages: AssessmentsPage[]) => {
      const loaded = pages.reduce((total, page) => total + page.items.length, 0);
      return loaded < lastPage.total ? loaded : undefined;
    },
  });

  const assessments = query.data?.pages.flatMap((page) => page.items) ?? [];
  const total = query.data?.pages[0]?.total ?? 0;
  const hasData = Boolean(query.data);
  const isInitialError = query.isError && !hasData;
  const hasPaginationError = query.isFetchNextPageError;
  const hasRefreshError = query.isRefetchError && !hasPaginationError;
  const isNotFound = query.error instanceof ApiError && query.error.status === 404;

  function returnToStudent(): void {
    if (!studentId) {
      router.dismissTo('/trainer/students');
      return;
    }

    router.dismissTo(`/trainer/students/${studentId}`);
  }

  if (!studentId) {
    return (
      <Screen scroll contentContainerStyle={styles.stateContent}>
        <AssessmentHeader
          backLabel="Voltar para alunos"
          onBack={returnToStudent}
          title="Avaliações"
        />
        <AssessmentStateCard
          description="Não foi possível identificar o aluno solicitado."
          iconName="alert-circle-outline"
          iconTestID="trainer-assessments-invalid-icon"
          title="Aluno inválido"
          testID="trainer-assessments-invalid-state"
        />
      </Screen>
    );
  }

  if (query.isPending) {
    return (
      <Screen scroll contentContainerStyle={styles.stateContent}>
        <AssessmentHeader
          backLabel="Voltar para aluno"
          onBack={returnToStudent}
          title="Avaliações"
        />
        <StatePanel
          description="Estamos buscando o histórico deste aluno."
          title="Carregando avaliações"
          tone="loading"
        />
      </Screen>
    );
  }

  if (isNotFound) {
    return (
      <Screen scroll contentContainerStyle={styles.stateContent}>
        <AssessmentHeader
          backLabel="Voltar para aluno"
          onBack={returnToStudent}
          title="Avaliações"
        />
        <AssessmentStateCard
          description="Estas avaliações não estão disponíveis para sua conta."
          iconName="alert-circle-outline"
          iconTestID="trainer-assessments-not-found-icon"
          title="Avaliações não encontradas"
          testID="trainer-assessments-not-found-state"
        />
      </Screen>
    );
  }

  if (isInitialError) {
    return (
      <Screen scroll contentContainerStyle={styles.stateContent}>
        <AssessmentHeader
          backLabel="Voltar para aluno"
          onBack={returnToStudent}
          title="Avaliações"
        />
        <AssessmentStateCard
          actionDisabled={query.isFetching}
          actionIconName="refresh-outline"
          actionIconTestID="trainer-assessments-error-retry-icon"
          actionLabel="Tentar novamente"
          actionVariant="primary"
          description="Verifique sua conexão e tente novamente."
          iconName="cloud-offline-outline"
          iconTestID="trainer-assessments-error-icon"
          onAction={() => void query.refetch()}
          title="Não foi possível carregar as avaliações."
          testID="trainer-assessments-error-state"
        />
      </Screen>
    );
  }

  function openAssessment(assessmentId: string): void {
    router.push({
      pathname: '/trainer/students/[studentId]/assessments/[assessmentId]',
      params: { studentId, assessmentId },
    });
  }

  const isEmpty = hasData && total === 0;

  return (
    <Screen scroll contentContainerStyle={styles.content}>
      <AssessmentHeader
        actionDisabled={query.isFetching}
        actionLabel={query.isRefetching ? 'Atualizando...' : 'Atualizar'}
        actionName="refresh-outline"
        actionOnPress={() => void query.refetch()}
        actionTestID="trainer-assessments-refresh"
        backLabel="Voltar para aluno"
        eyebrow={studentName}
        onBack={returnToStudent}
        testID="trainer-assessments-header"
        title="Avaliações"
      />
      {!isEmpty ? (
        <View style={styles.intro}>
          <Text style={styles.introTitle}>Avaliações</Text>
          <Text style={styles.introSubtitle}>
            {studentName
              ? `Histórico de ${studentName} em ordem cronológica.`
              : 'Consulte o histórico de medidas e avaliações deste aluno.'}
          </Text>
        </View>
      ) : null}

      {isEmpty ? (
        <AssessmentStateCard
          description="As avaliações da aluna aparecerão aqui quando estiverem disponíveis."
          iconName="clipboard-outline"
          iconTestID="trainer-assessments-empty-icon"
          title="Nenhuma avaliação registrada."
          testID="trainer-assessments-empty-state"
        />
      ) : null}

      {assessments.length > 0 ? (
        <View style={styles.assessmentList} testID="trainer-assessments-list">
          {assessments.map((assessment) => (
            <AssessmentListItem
              assessment={assessment}
              key={assessment.id}
              onPress={() => openAssessment(assessment.id)}
            />
          ))}
        </View>
      ) : null}

      {hasRefreshError ? (
        <InlineMessage message="Não foi possível atualizar as avaliações." tone="error" />
      ) : null}

      {hasPaginationError ? (
        <>
          <InlineMessage message="Não foi possível carregar mais avaliações." tone="error" />
          <AppButton
            disabled={query.isFetching}
            label={query.isFetchingNextPage ? 'Carregando mais...' : 'Tentar carregar mais'}
            onPress={() => void query.fetchNextPage()}
            variant="secondary"
          />
        </>
      ) : null}

      {query.hasNextPage && !hasPaginationError ? (
        <AppButton
          disabled={query.isFetching}
          label={query.isFetchingNextPage ? 'Carregando mais...' : 'Carregar mais'}
          onPress={() => void query.fetchNextPage()}
          variant="secondary"
        />
      ) : null}
    </Screen>
  );
}

type AssessmentHeaderProps = {
  actionDisabled?: boolean;
  actionLabel?: string;
  actionName?: ComponentProps<typeof Ionicons>['name'];
  actionOnPress?: () => void;
  actionTestID?: string;
  backLabel: string;
  eyebrow?: string;
  onBack: () => void;
  testID?: string;
  title: string;
};

function AssessmentHeader({
  actionDisabled = false,
  actionLabel,
  actionName,
  actionOnPress,
  actionTestID,
  backLabel,
  eyebrow,
  onBack,
  testID,
  title,
}: AssessmentHeaderProps) {
  return (
    <View style={styles.header} testID={testID}>
      <View style={styles.headerLead}>
        <Pressable
          accessible
          accessibilityLabel={backLabel}
          accessibilityRole="button"
          onPress={onBack}
          style={styles.backButton}
        >
          <Ionicons
            color={colors.ink}
            name="arrow-back"
            size={20}
            testID="trainer-assessments-back-icon"
          />
        </Pressable>
        <Text style={styles.headerTitle}>{eyebrow ?? title}</Text>
      </View>
      {actionLabel && actionOnPress && actionName ? (
        <Pressable
          accessible
          accessibilityLabel={actionLabel}
          accessibilityRole="button"
          accessibilityState={{ disabled: actionDisabled }}
          disabled={actionDisabled}
          onPress={actionOnPress}
          style={styles.headerAction}
          testID={actionTestID}
        >
          <Ionicons color={colors.muted} name={actionName} size={20} />
        </Pressable>
      ) : null}
    </View>
  );
}

type AssessmentStateCardProps = {
  actionDisabled?: boolean;
  actionIconName?: ComponentProps<typeof Ionicons>['name'];
  actionIconTestID?: string;
  actionLabel?: string;
  actionVariant?: 'primary' | 'secondary';
  description: string;
  iconName: ComponentProps<typeof Ionicons>['name'];
  iconTestID: string;
  onAction?: () => void;
  testID: string;
  title: string;
};

function AssessmentStateCard({
  actionDisabled = false,
  actionIconName,
  actionIconTestID,
  actionLabel,
  actionVariant = 'secondary',
  description,
  iconName,
  iconTestID,
  onAction,
  testID,
  title,
}: AssessmentStateCardProps) {
  return (
    <Card style={styles.stateCard} testID={testID}>
      <View style={styles.stateIcon} testID={iconTestID}>
        <Ionicons color="#3498DB" name={iconName} size={24} />
      </View>
      <Text style={styles.stateTitle}>{title}</Text>
      <Text style={styles.stateDescription}>{description}</Text>
      {actionLabel && onAction ? (
        <View style={styles.stateAction}>
          <AppButton
            disabled={actionDisabled}
            label={actionLabel}
            onPress={onAction}
            trailingIcon={
              actionIconName ? (
                <Ionicons
                  color={colors.ink}
                  name={actionIconName}
                  size={18}
                  testID={actionIconTestID}
                />
              ) : undefined
            }
            variant={actionVariant}
          />
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  backButton: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: radii.pill,
    borderWidth: 1,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  assessmentList: {
    gap: spacing.md,
  },
  content: {
    gap: spacing.lg,
    padding: 20,
    paddingBottom: spacing.xxl,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 44,
  },
  headerAction: {
    alignItems: 'center',
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  headerLead: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  headerTitle: {
    color: colors.ink,
    fontFamily: typography.exerciseTitle.fontFamily,
    fontSize: 20,
    fontWeight: '700',
  },
  intro: {
    gap: spacing.xs,
  },
  introSubtitle: {
    color: colors.muted,
    fontFamily: typography.body.fontFamily,
    fontSize: 13,
    lineHeight: 18,
  },
  introTitle: {
    color: colors.ink,
    fontFamily: typography.exerciseTitle.fontFamily,
    fontSize: 24,
    fontWeight: '700',
  },
  stateAction: {
    width: '100%',
  },
  stateContent: {
    gap: spacing.lg,
    padding: 20,
    paddingBottom: spacing.xxl,
  },
  stateCard: {
    alignItems: 'center',
    borderRadius: radii.control,
    gap: spacing.md,
    padding: spacing.xxl,
  },
  stateDescription: {
    color: colors.muted,
    fontFamily: typography.body.fontFamily,
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
  },
  stateIcon: {
    alignItems: 'center',
    backgroundColor: '#EBF5FB',
    borderRadius: radii.pill,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  stateTitle: {
    color: colors.ink,
    fontFamily: typography.exerciseTitle.fontFamily,
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
});
