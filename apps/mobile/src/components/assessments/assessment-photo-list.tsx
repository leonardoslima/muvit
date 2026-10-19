import { useState } from 'react';
import { AssessmentPhotoGrid } from './assessment-photo-grid';
import { AssessmentPhotoViewer } from './assessment-photo-viewer';

export type AssessmentPhotoListProps = {
  dateLabel: string;
  photos: string[];
};

export function AssessmentPhotoList({
  dateLabel,
  photos,
}: AssessmentPhotoListProps): React.JSX.Element {
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  return (
    <>
      <AssessmentPhotoGrid
        photos={photos.map((uri: string) => ({ uri }))}
        getPhotoAccessibilityLabel={(index: number) =>
          `Foto ${index + 1} da avaliação de ${dateLabel}`
        }
        onOpen={setViewerIndex}
      />
      <AssessmentPhotoViewer
        photos={photos}
        index={viewerIndex}
        onIndexChange={setViewerIndex}
        onClose={() => setViewerIndex(null)}
      />
    </>
  );
}
