import { useQuery } from '@tanstack/react-query';
import { Link } from 'expo-router';
import { useRef, useState } from 'react';
import { View } from 'react-native';
import type { Assessment, AssessmentsPage } from '../application/assessments/assessment-data';
import { AssessmentPhotoViewer } from '../components/assessments/assessment-photo-viewer';
import { StudentAssessmentCard } from '../components/assessments/student-assessment-card';
import { Screen, ScreenHeader } from '../components/ui/screen';
import { Button, Message, StatePanel, Text } from '../components/ui/v2';
import { authClient } from '../lib/auth-client';
import { useApiClient } from '../lib/use-api';

type OpenAssessmentPhotos = {
  photos: readonly string[];
  index: number;
};

export function ProgressScreen(): React.JSX.Element {
  const api = useApiClient();
  const session = authClient.useSession();
  const displayName = session.data?.user.name?.trim() || 'Aluno';
  const initials = getInitials(session.data?.user.name);
  const retrying = useRef(false);
  const [openPhotos, setOpenPhotos] = useState<OpenAssessmentPhotos | null>(null);
  const query = useQuery({
    queryKey: ['assessments', 'me'],
    queryFn: async () => api.request<AssessmentsPage>('/students/me/assessments?limit=20'),
  });

  const hasResponse = query.data !== undefined;
  const isLoadingWithoutResponse = !hasResponse && query.isFetching;
  const hasInitialError = !hasResponse && query.isError && !query.isFetching;
  const hasRefreshError = hasResponse && query.isError && !query.isFetching;

  function retry(): void {
    if (retrying.current || query.isFetching) return;
    retrying.current = true;
    void query.refetch().then(
      () => {
        retrying.current = false;
      },
      () => {
        retrying.current = false;
      },
    );
  }

  function openAssessmentPhoto(photos: readonly string[], index: number): void {
    setOpenPhotos({ photos, index });
  }

  return (
    <>
      <Screen scroll>
        <View className="gap-5" testID="progress-page-header">
          <View className="flex-row items-center justify-between" testID="progress-brand-row">
            <Text
              accessibilityLabel="Muvit"
              className="font-v2-bold text-v2-text"
              variant="sectionTitle"
            >
              muvit<Text className="text-v2-primary">.</Text>
            </Text>
            <View
              accessible
              accessibilityLabel={`Iniciais de ${displayName}`}
              className="h-12 w-12 items-center justify-center rounded-full bg-v2-subtle"
            >
              <Text className="text-v2-brand" variant="label">
                {initials}
              </Text>
            </View>
          </View>
          <View className="gap-2" testID="progress-title-block">
            <ScreenHeader
              subtitle="Acompanhe suas medidas e perceba sua evolução."
              title="Progresso"
            />
          </View>
          <Link asChild href="/new-assessment">
            <Button
              className="w-full"
              label="Nova avaliação"
              onPress={() => undefined}
              testID="progress-new-assessment"
              variant="secondary"
            />
          </Link>
        </View>

        <Text
          accessibilityRole="header"
          className="text-v2-text"
          testID="progress-assessments-heading"
          variant="sectionTitle"
        >
          Suas avaliações
        </Text>

        {isLoadingWithoutResponse ? (
          <StatePanel
            description="Estamos buscando suas avaliações mais recentes."
            kind="loading"
            title="Carregando progresso"
          />
        ) : null}

        {hasInitialError ? (
          <StatePanel
            action={{ label: 'Tentar novamente', onPress: retry }}
            description="Verifique sua conexão e tente novamente."
            kind="error"
            title="Não foi possível carregar seu progresso"
          />
        ) : null}

        {hasRefreshError ? (
          <Message
            action={{ label: 'Tentar novamente', onPress: retry }}
            title="Não foi possível atualizar suas avaliações."
            variant="error"
          />
        ) : null}

        {query.data?.items.length === 0 ? (
          <StatePanel
            description="Registre uma avaliação para acompanhar sua evolução."
            kind="empty"
            title="Nenhuma avaliação registrada"
          />
        ) : null}

        {query.data?.items.map((assessment: Assessment, index: number) => (
          <StudentAssessmentCard
            assessment={assessment}
            key={assessment.id}
            onOpenPhoto={(photoIndex) => {
              if (assessment.photos) openAssessmentPhoto(assessment.photos, photoIndex);
            }}
            previousAssessment={query.data?.items[index + 1]}
          />
        ))}
      </Screen>
      <AssessmentPhotoViewer
        index={openPhotos?.index ?? null}
        onClose={() => setOpenPhotos(null)}
        onIndexChange={(index) =>
          setOpenPhotos((current) => (current ? { ...current, index } : null))
        }
        photos={openPhotos?.photos ?? []}
      />
    </>
  );
}

function getInitials(name: string | undefined): string {
  const parts = name?.trim().split(/\s+/).filter(Boolean) ?? [];
  const initials = parts
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');

  return initials || 'AL';
}
