import type { AssessmentPhotoInput } from '../../application/assessments/assessment-form';
import { AssessmentPhotoGrid } from './assessment-photo-grid';

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
  const description =
    photos.length === 0
      ? 'Até 3 fotos · JPEG ou PNG'
      : `${photos.length} ${photos.length === 1 ? 'foto selecionada' : 'fotos selecionadas'}`;

  return (
    <AssessmentPhotoGrid
      addLabel="Adicionar foto"
      appearance="trainer"
      description={description}
      disabled={disabled}
      emptyHint="Envie fotos da evolução do aluno, se desejar."
      maxPhotos={3}
      onAdd={onAdd}
      onRemove={onRemove}
      photos={photos}
      testID="trainer-assessment-photo-grid"
    />
  );
}
