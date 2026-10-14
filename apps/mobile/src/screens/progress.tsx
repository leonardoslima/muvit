import { useQuery } from '@tanstack/react-query';
import { Link } from 'expo-router';
import { useRef, useState } from 'react';
import { View } from 'react-native';
import type { Assessment, AssessmentsPage } from '../application/assessments/assessment-data';
import { AssessmentPhotoViewer } from '../components/assessments/assessment-photo-viewer';
import { StudentAssessmentCard } from '../components/assessments/student-assessment-card';
import { Screen, ScreenHeader } from '../components/ui/screen';
import { Button, Message, StatePanel, Text } from '../components/ui/v2';
import { useApiClient } from '../lib/use-api';

type OpenAssessmentPhotos = {
  photos: readonly string[];
  index: number;
};

export function ProgressScreen(): React.JSX.Element {
  const api = useApiClient();
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
        <View className="flex-row items-start justify-between gap-4">
          <View className="min-w-0 flex-1">
            <ScreenHeader
              subtitle="Acompanhe suas medidas e perceba sua evolução."
              title="Progresso"
            />
          </View>
          <Link asChild href="/new-assessment">
            <Button label="Nova avaliação" onPress={() => undefined} variant="secondary" />
          </Link>
        </View>

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
