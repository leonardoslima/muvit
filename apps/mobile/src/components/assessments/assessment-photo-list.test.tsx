import { render, screen } from '@testing-library/react-native';
import { createElement } from 'react';
import { StyleSheet } from 'react-native';
import { describe, expect, it, vi } from 'vitest';
import { AssessmentPhotoList } from './assessment-photo-list';

vi.mock('@expo/vector-icons', () => ({
  Ionicons: (props: Record<string, unknown>) => createElement('Ionicons', props),
}));

describe('AssessmentPhotoList', () => {
  it('alinha o cartão e a prévia da foto ao detalhe do treinador', () => {
    render(<AssessmentPhotoList dateLabel="03/09/2026" photos={['https://cdn.test/front.jpg']} />);

    expect(
      StyleSheet.flatten(screen.getByTestId('assessment-photo-card-1').props.style),
    ).toMatchObject({
      borderRadius: 8,
      gap: 14,
      height: 128,
      padding: 16,
    });
    expect(
      StyleSheet.flatten(screen.getByTestId('assessment-photo-preview-1').props.style),
    ).toMatchObject({
      borderRadius: 4,
      height: 94,
      width: 94,
    });
  });

  it('apresenta a foto como cartão de evolução com contexto da avaliação', () => {
    render(<AssessmentPhotoList dateLabel="03/09/2026" photos={['https://cdn.test/front.jpg']} />);

    expect(screen.getByText('Foto de evolução')).toBeTruthy();
    expect(screen.getByText('Vista frontal • registrada nesta avaliação')).toBeTruthy();
    expect(screen.getByLabelText('Foto 1 da avaliação de 03/09/2026')).toBeTruthy();
  });
});
