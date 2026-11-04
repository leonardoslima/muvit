import { useState } from 'react';
import type { AssessmentPhotoInput } from '../../application/assessments/assessment-form';
import { AssessmentPhotoGrid } from './assessment-photo-grid';
import { AssessmentPhotoViewer } from './assessment-photo-viewer';

export type TrainerAssessmentPhotosProps = {
  photos: readonly AssessmentPhotoInput[];
  disabled: boolean;
  onAdd: () => void;
  onRemove: (index: number) => void;
};

export function TrainerAssessmentPhotos({
  photos,
  disabled,
  onAdd,
  onRemove,
}: TrainerAssessmentPhotosProps): React.JSX.Element {
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const description =
    photos.length === 0
      ? 'Até 3 fotos · JPEG ou PNG'
      : `${photos.length} ${photos.length === 1 ? 'foto selecionada' : 'fotos selecionadas'}`;

  return (
    <>
      <AssessmentPhotoGrid
        addLabel="Adicionar foto"
        description={description}
        disabled={disabled}
        emptyHint="Envie fotos da evolução do aluno, se desejar."
        maxPhotos={3}
        onAdd={onAdd}
        onOpen={setViewerIndex}
        onRemove={onRemove}
        photos={photos}
        testID="trainer-assessment-photo-grid"
      />
      <AssessmentPhotoViewer
        photos={photos.map((photo) => photo.uri)}
        index={viewerIndex}
        onIndexChange={setViewerIndex}
        onClose={() => setViewerIndex(null)}
      />
    </>
  );
}
