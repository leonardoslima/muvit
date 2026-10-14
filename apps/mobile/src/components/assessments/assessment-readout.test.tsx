import { render, screen } from '@testing-library/react-native';
import { describe, expect, it } from 'vitest';
import { AssessmentMeasurementsCard } from './assessment-measurements-card';
import { AssessmentMetric } from './assessment-metric';
import { AssessmentPhotoList } from './assessment-photo-list';

describe('AssessmentMetric', () => {
  it('exibe o label e o valor recebidos sem truncamento', () => {
    const value = '123.456.789,5 cm';

    render(<AssessmentMetric label="Medida extensa" value={value} />);

    expect(screen.getByText('Medida extensa')).toBeTruthy();
    expect(screen.getByText(value).props.numberOfLines).toBeUndefined();
  });
});

describe('AssessmentMeasurementsCard', () => {
  it('renderiza somente as medidas recebidas e preserva zero como valor', () => {
    render(<AssessmentMeasurementsCard measurements={{ chest: 0, waist: 80 }} />);

    expect(screen.getByText('Peito')).toBeTruthy();
    expect(screen.getByText('0 cm')).toBeTruthy();
    expect(screen.getByText('Cintura')).toBeTruthy();
    expect(screen.getByText('80 cm')).toBeTruthy();
    expect(screen.queryByText('Quadril')).toBeNull();
  });

  it('mostra Não informado quando não há medidas', () => {
    render(<AssessmentMeasurementsCard measurements={null} />);

    expect(screen.getByText('Medidas de circunferência')).toBeTruthy();
    expect(screen.getByText('Não informado')).toBeTruthy();
  });
});

describe('AssessmentPhotoList', () => {
  it('rotula cada foto pela ordem e data e usa enquadramento contain em 4:3', () => {
    render(
      <AssessmentPhotoList
        dateLabel="03/09/2026"
        photos={['https://cdn.test/front.jpg', 'https://cdn.test/back.jpg']}
      />,
    );

    const firstPhoto = screen.getByLabelText('Foto 1 da avaliação de 03/09/2026');
    const secondPhoto = screen.getByLabelText('Foto 2 da avaliação de 03/09/2026');
    expect(firstPhoto.props.resizeMode).toBe('contain');
    expect(firstPhoto.props.style.aspectRatio).toBe(4 / 3);
    expect(secondPhoto.props.accessibilityLabel).toBe('Foto 2 da avaliação de 03/09/2026');
    expect(screen.queryByRole('button')).toBeNull();
  });
});
