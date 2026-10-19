import { fireEvent, render, screen } from '@testing-library/react-native';
import { describe, expect, it, vi } from 'vitest';
import { AssessmentMeasurementsCard } from './assessment-measurements-card';
import { AssessmentMetric } from './assessment-metric';
import { AssessmentPhotoList } from './assessment-photo-list';

vi.mock('react-native-safe-area-context', () => ({ SafeAreaView: 'View' }));

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
  it('mostra miniaturas quadradas em grade e preserva a foto inteira', () => {
    render(
      <AssessmentPhotoList
        dateLabel="03/09/2026"
        photos={['https://cdn.test/front.jpg', 'https://cdn.test/back.jpg']}
      />,
    );

    const firstPhoto = screen.getByLabelText('Foto 1 da avaliação de 03/09/2026');
    const secondPhoto = screen.getByLabelText('Foto 2 da avaliação de 03/09/2026');
    expect(firstPhoto.props.resizeMode).toBe('contain');
    expect(firstPhoto.props.style.aspectRatio).toBe(1);
    expect(secondPhoto.props.accessibilityLabel).toBe('Foto 2 da avaliação de 03/09/2026');
    expect(screen.getByTestId('assessment-photo-grid')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Adicionar foto' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Remover foto 1' })).toBeNull();
  });

  it('amplia a foto tocada e permite navegar e fechar', () => {
    render(
      <AssessmentPhotoList
        dateLabel="03/09/2026"
        photos={['https://cdn.test/front.jpg', 'https://cdn.test/back.jpg']}
      />,
    );
    fireEvent.press(screen.getByRole('button', { name: 'Abrir foto 2' }));
    expect(screen.getByLabelText('Prévia ampliada da foto 2').props.source.uri).toBe(
      'https://cdn.test/back.jpg',
    );
    expect(screen.getByLabelText('Prévia ampliada da foto 2').props.resizeMode).toBe('contain');
    fireEvent.press(screen.getByRole('button', { name: 'Foto anterior' }));
    expect(screen.getByLabelText('Prévia ampliada da foto 1').props.source.uri).toBe(
      'https://cdn.test/front.jpg',
    );
    fireEvent.press(screen.getByRole('button', { name: 'Fechar fotos' }));
    expect(screen.queryByLabelText('Prévia ampliada da foto 1')).toBeNull();
  });
});
