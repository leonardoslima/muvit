import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { type ReactNode, useState } from 'react';
import { type LayoutChangeEvent, ScrollView, View } from 'react-native';
import { type TrainerStudent, getTrainerStudent } from '../application/trainer/trainer-data';
import { StudentActionButton } from '../components/trainer/student-action-button';
import { StudentStatusBadge } from '../components/trainer/student-status-badge';
import { TrainerScreen } from '../components/trainer/trainer-screen';
import { Message } from '../components/ui/v2/message';
import { StatePanel } from '../components/ui/v2/state-panel';
import { Text, TextClassContext } from '../components/ui/v2/text';
import { ApiError } from '../lib/api';
import { spacing } from '../lib/design-system/tokens';
import { useApiClient } from '../lib/use-api';

export function TrainerStudentDetailScreen(): React.JSX.Element {
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
  const isNotFound = query.error instanceof ApiError && query.error.status === 404;
  const refresh = (): void => {
    if (studentId) void query.refetch();
  };

  if (!studentId) {
    return (
      <TrainerScreen
        contextual
        onBack={returnToStudents}
        onRefresh={refresh}
        refreshDisabled
        title="Alunos"
      >
        <StatePanel
          description="Não foi possível identificar o aluno solicitado."
          kind="error"
          title="Aluno inválido"
          className="flex-1"
        />
      </TrainerScreen>
    );
  }

  if (query.isPending) {
    return (
      <TrainerScreen
        contextual
        onBack={returnToStudents}
        onRefresh={refresh}
        refreshDisabled
        title="Alunos"
      >
        <StatePanel
          description="Estamos carregando os dados deste aluno."
          kind="loading"
          title="Carregando aluno"
          className="flex-1"
        />
      </TrainerScreen>
    );
  }

  if (isNotFound) {
    return (
      <TrainerScreen
        contextual
        onBack={returnToStudents}
        onRefresh={refresh}
        refreshDisabled
        title="Alunos"
      >
        <StatePanel
          description="Este aluno não está disponível para sua conta."
          kind="error"
          title="Aluno não encontrado"
          className="flex-1"
        />
      </TrainerScreen>
    );
  }

  if (!query.data) {
    return (
      <TrainerScreen
        contextual
        onBack={returnToStudents}
        onRefresh={refresh}
        refreshDisabled={query.isFetching}
        title="Alunos"
      >
        <StatePanel
          description="Verifique sua conexão e atualize para tentar novamente."
          kind="error"
          title="Não foi possível carregar o aluno"
          className="flex-1"
        />
      </TrainerScreen>
    );
  }

  const student = query.data;
  const hasContact = Boolean(student.email || student.phone);

  return (
    <TrainerScreen
      contextual
      onBack={returnToStudents}
      onRefresh={refresh}
      refreshDisabled={query.isFetching}
      refreshing={query.isRefetching && Boolean(query.data)}
      title="Alunos"
    >
      <ScrollView className="flex-1" contentContainerStyle={{ gap: spacing.xl }}>
        {query.isRefetchError ? (
          <Message title="Não foi possível atualizar o aluno." variant="error" />
        ) : null}

        <IdentityCard student={student} />

        <DetailSection title="Contato">
          {hasContact ? (
            <>
              <DetailRow label="E-mail" value={student.email ?? 'Não informado'} />
              <DetailRow label="Telefone" value={student.phone ?? 'Não informado'} />
            </>
          ) : (
            <Text className="text-v2-secondary">Sem contato cadastrado</Text>
          )}
        </DetailSection>

        <DetailSection title="Informações">
          <View className="flex-row flex-wrap gap-4">
            <DetailRow label="Nascimento" value={formatBirthDate(student.birthDate)} />
            <DetailRow label="Gênero" value={formatGender(student.gender)} />
          </View>
        </DetailSection>

        <DetailSection title="Objetivo">
          <Text>{student.goals ?? 'Sem objetivo cadastrado'}</Text>
        </DetailSection>

        <DetailSection title="Restrições">
          <Text>{student.restrictions ?? 'Sem restrições cadastradas'}</Text>
        </DetailSection>

        <DetailSection title="Avaliações">
          <View className="flex-row flex-wrap gap-3">
            <StudentActionButton
              kind="history"
              label="Ver histórico"
              onPress={() =>
                router.push({
                  pathname: '/trainer/students/[studentId]/assessments',
                  params: { studentId },
                })
              }
            />
            <StudentActionButton
              kind="assessment"
              label="Nova avaliação"
              onPress={() =>
                router.push({
                  pathname: '/trainer/students/[studentId]/assessments/new',
                  params: { studentId },
                })
              }
            />
          </View>
        </DetailSection>

        <DetailSection title="Treinos">
          <View className="flex-row flex-wrap gap-3">
            <StudentActionButton
              kind="workouts"
              label="Ver treinos"
              onPress={() =>
                router.push({
                  pathname: '/trainer/students/[studentId]/workouts',
                  params: { studentId },
                })
              }
            />
            <StudentActionButton
              kind="workout"
              label="Novo treino"
              onPress={() =>
                router.push({
                  pathname: '/trainer/students/[studentId]/workouts/new',
                  params: { studentId },
                })
              }
            />
          </View>
        </DetailSection>
      </ScrollView>
    </TrainerScreen>
  );
}

function IdentityCard({ student }: { student: TrainerStudent }): React.JSX.Element {
  const [width, setWidth] = useState<number>();
  const handleLayout = (event: LayoutChangeEvent): void => {
    setWidth(event.nativeEvent.layout.width);
  };
  const compact = width !== undefined && width <= 300;

  return (
    <View
      className="gap-3 rounded-[26px] bg-v2-text p-5"
      onLayout={handleLayout}
      testID="trainer-student-identity"
    >
      <View className="flex-row items-center gap-3">
        <View className="h-14 w-14 shrink-0 items-center justify-center rounded-full bg-v2-primary">
          <Text className="font-v2-bold text-v2-text" variant="sectionTitle">
            {getInitials(student.name)}
          </Text>
        </View>
        <View className="min-w-0 flex-1 gap-1">
          <Text
            className={`font-v2-bold text-v2-sessionText ${compact ? 'text-[20px] leading-[26px]' : 'text-[24px] leading-[30px]'}`}
          >
            {student.name}
          </Text>
          <StudentStatusBadge compact status={student.status} />
        </View>
      </View>
    </View>
  );
}

function DetailSection({
  children,
  title,
}: { children: ReactNode; title: string }): React.JSX.Element {
  const [width, setWidth] = useState<number>();
  const compact = width !== undefined && width <= 300;
  const handleLayout = (event: LayoutChangeEvent): void => {
    setWidth(event.nativeEvent.layout.width);
  };

  return (
    <View className="gap-2" onLayout={handleLayout}>
      <Text
        className={`font-v2-bold text-v2-text ${compact ? 'text-[16px] leading-[22px]' : 'text-[18px] leading-[24px]'}`}
      >
        {title}
      </Text>
      <TextClassContext.Provider
        value={compact ? 'text-[14px] leading-[20px]' : 'text-[15px] leading-[22px]'}
      >
        {children}
      </TextClassContext.Provider>
    </View>
  );
}

function DetailRow({ label, value }: { label: string; value: string }): React.JSX.Element {
  return (
    <View className="min-w-[120px] flex-1 gap-1">
      <Text className="font-v2-bold text-v2-secondary" variant="support">
        {label}
      </Text>
      <Text>{value}</Text>
    </View>
  );
}

function formatBirthDate(value: string | null): string {
  if (!value) return 'Não informado';

  const [year, month, day] = value.split('-');
  if (!year || !month || !day) return value;

  return `${day}/${month}/${year}`;
}

function formatGender(value: TrainerStudent['gender']): string {
  if (value === 'male') return 'Masculino';
  if (value === 'female') return 'Feminino';
  if (value === 'other') return 'Outro';
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
