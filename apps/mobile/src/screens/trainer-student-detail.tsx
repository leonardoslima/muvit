import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { type TrainerStudent, getTrainerStudent } from '../application/trainer/trainer-data';
import { StudentStatusBadge } from '../components/trainer/student-status-badge';
import { AppButton } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { InlineMessage } from '../components/ui/inline-message';
import { Screen, ScreenHeader } from '../components/ui/screen';
import { StatePanel } from '../components/ui/state-panel';
import { ApiError } from '../lib/api';
import { colors, controlSizes, radii, sharedStyles, spacing, typography } from '../lib/styles';
import { useApiClient } from '../lib/use-api';

export function TrainerStudentDetailScreen() {
  const api = useApiClient();
  const params = useLocalSearchParams<{ studentId?: string | string[] }>();
  const studentId = Array.isArray(params.studentId) ? params.studentId[0] : params.studentId;
  const query = useQuery({
    enabled: Boolean(studentId),
    queryKey: ['trainer', 'student', studentId],
    queryFn: ({ signal }) => {
      if (!studentId) {
        throw new Error('Aluno inválido.');
      }

      return getTrainerStudent(api, studentId, signal);
    },
  });

  if (!studentId) {
    return (
      <Screen style={styles.centeredState}>
        <StatePanel
          actionLabel="Voltar para alunos"
          description="Não foi possível identificar o aluno solicitado."
          onAction={returnToStudents}
          title="Aluno inválido"
          tone="error"
        />
      </Screen>
    );
  }

  if (query.isPending) {
    return (
      <Screen style={styles.centeredState}>
        <StatePanel
          description="Estamos carregando os dados deste aluno."
          title="Carregando aluno"
          tone="loading"
        />
      </Screen>
    );
  }

  const isNotFound = query.error instanceof ApiError && query.error.status === 404;

  if (isNotFound) {
    return (
      <Screen style={styles.centeredState}>
        <StatePanel
          actionLabel="Voltar para alunos"
          description="Este aluno não está disponível para sua conta."
          onAction={returnToStudents}
          title="Aluno não encontrado"
          tone="error"
        />
      </Screen>
    );
  }

  if (query.isError && !query.data) {
    return (
      <Screen style={styles.centeredState}>
        <StatePanel
          actionLabel="Tentar novamente"
          description="Verifique sua conexão e tente novamente."
          onAction={() => void query.refetch()}
          title="Não foi possível carregar o aluno"
          tone="error"
        />
      </Screen>
    );
  }

  const student = query.data;

  const hasContact = Boolean(student.email || student.phone);

  return (
    <Screen scroll contentContainerStyle={styles.content}>
      <AppButton label="Voltar para alunos" onPress={returnToStudents} variant="secondary" />
      <ScreenHeader eyebrow="Aluno" title={student.name} />

      <Card>
        <View style={styles.identityRow}>
          <View accessibilityLabel={`Iniciais de ${student.name}`} style={styles.avatar}>
            <Text style={styles.avatarText}>{getInitials(student.name)}</Text>
          </View>
          <View style={styles.identityCopy}>
            <Text style={styles.label}>Status</Text>
            <StudentStatusBadge status={student.status} />
          </View>
        </View>
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>Contato</Text>
        {hasContact ? (
          <>
            <DetailRow label="E-mail" value={student.email ?? 'Não informado'} />
            <DetailRow label="Telefone" value={student.phone ?? 'Não informado'} />
          </>
        ) : (
          <Text style={sharedStyles.subtitle}>Sem contato cadastrado</Text>
        )}
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>Informações</Text>
        <DetailRow label="Nascimento" value={formatBirthDate(student.birthDate)} />
        <DetailRow label="Gênero" value={formatGender(student.gender)} />
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>Objetivo</Text>
        <Text style={sharedStyles.subtitle}>{student.goals ?? 'Sem objetivo cadastrado'}</Text>
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>Restrições</Text>
        <Text style={sharedStyles.subtitle}>
          {student.restrictions ?? 'Sem restrições cadastradas'}
        </Text>
      </Card>

      {query.isRefetchError ? (
        <InlineMessage message="Não foi possível atualizar o aluno." tone="error" />
      ) : null}

      <AppButton
        disabled={query.isRefetching}
        label={query.isRefetching ? 'Atualizando...' : 'Atualizar'}
        onPress={() => void query.refetch()}
        variant="secondary"
      />
    </Screen>
  );
}

function DetailRow({ label, value }: { label: string; value: string }): React.JSX.Element {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.label}>{label}</Text>
      <Text style={sharedStyles.subtitle}>{value}</Text>
    </View>
  );
}

function formatBirthDate(value: string | null): string {
  if (!value) {
    return 'Não informado';
  }

  const [year, month, day] = value.split('-');

  if (!year || !month || !day) {
    return value;
  }

  return `${day}/${month}/${year}`;
}

function formatGender(value: TrainerStudent['gender']): string {
  if (value === 'male') {
    return 'Masculino';
  }

  if (value === 'female') {
    return 'Feminino';
  }

  if (value === 'other') {
    return 'Outro';
  }

  return 'Não informado';
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const initials = parts
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');

  return initials || 'AL';
}

function returnToStudents(): void {
  router.replace('/trainer/students');
}

const styles = StyleSheet.create({
  centeredState: {
    justifyContent: 'center',
  },
  content: {
    paddingBottom: spacing.xxxl,
  },
  identityRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.lg,
  },
  avatar: {
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: radii.avatar,
    height: controlSizes.avatar,
    justifyContent: 'center',
    width: controlSizes.avatar,
  },
  avatarText: {
    color: colors.ink,
    ...typography.title,
  },
  identityCopy: {
    gap: spacing.sm,
  },
  sectionTitle: {
    color: colors.ink,
    ...typography.cardTitle,
  },
  detailRow: {
    gap: spacing.xs,
  },
  label: {
    color: colors.ink,
    ...typography.bodyStrong,
  },
});
