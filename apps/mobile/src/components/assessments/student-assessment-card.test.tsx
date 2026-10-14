import { fireEvent, render, screen } from '@testing-library/react-native';
import { describe, expect, it, vi } from 'vitest';
import type { Assessment } from '../../application/assessments/assessment-data';
import { StudentAssessmentCard } from './student-assessment-card';

function assessment(overrides: Partial<Assessment> = {}): Assessment {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    studentId: '22222222-2222-4222-8222-222222222222',
    date: '2026-10-14',
    weightKg: null,
    heightCm: null,
    bodyFatPct: null,
    measurements: null,
    photos: null,
    notes: null,
    createdAt: '2026-10-14T12:00:00.000Z',
    ...overrides,
  };
}

describe('StudentAssessmentCard', () => {
  it('exibe somente altura e circunferências recebidas', () => {
    render(
      <StudentAssessmentCard
        assessment={assessment({ heightCm: '172.5', measurements: { chest: 96, armRight: 34 } })}
        onOpenPhoto={() => undefined}
      />,
    );

    expect(screen.getByText('Altura')).toBeTruthy();
    expect(screen.getByText('172,5 cm')).toBeTruthy();
    expect(screen.getByText('Medidas de circunferência')).toBeTruthy();
    expect(screen.getByText('Peito')).toBeTruthy();
    expect(screen.getByText('96 cm')).toBeTruthy();
    expect(screen.getByText('Braço direito')).toBeTruthy();
    expect(screen.getByText('34 cm')).toBeTruthy();
    expect(screen.queryByText('Cintura')).toBeNull();
  });

  it('omite seções vazias de medidas e fotos', () => {
    render(<StudentAssessmentCard assessment={assessment()} onOpenPhoto={() => undefined} />);

    expect(screen.queryByText('Altura')).toBeNull();
    expect(screen.queryByText('Medidas de circunferência')).toBeNull();
    expect(screen.queryByTestId('student-assessment-photos')).toBeNull();
  });

  it('mantém observações longas sem truncamento', () => {
    const notes = 'Observação detalhada. '.repeat(200);
    render(
      <StudentAssessmentCard assessment={assessment({ notes })} onOpenPhoto={() => undefined} />,
    );

    expect(screen.getByText(notes).props.numberOfLines).toBeUndefined();
  });

  it('agrupa peso e gordura em duas colunas e identifica comparações abaixo', () => {
    render(
      <StudentAssessmentCard
        assessment={assessment({ weightKg: 72.4, bodyFatPct: 21.6 })}
        previousAssessment={assessment({ weightKg: 73.2, bodyFatPct: 22 })}
        onOpenPhoto={() => undefined}
      />,
    );

    const metrics = screen.getByTestId('student-assessment-primary-metrics');
    expect(metrics.props.className).toContain('flex-row');
    expect(screen.getByText('Peso')).toBeTruthy();
    expect(screen.getByText('Gordura corporal')).toBeTruthy();
    expect(screen.getByText('72,4 kg').props.className).toContain('font-v2-bold');
    expect(screen.getByText('21,6%').props.className).toContain('font-v2-bold');
    expect(screen.getByText('Peso: 0,8 kg a menos')).toBeTruthy();
    expect(screen.getByText('Gordura: 0,4 p.p. a menos')).toBeTruthy();
  });

  it('mostra oito fotos e encaminha cada índice para abertura sem remover anexos', () => {
    const onOpenPhoto = vi.fn();
    const photos = Array.from(
      { length: 8 },
      (_, index) => `https://cdn.test/photo-${index + 1}.jpg`,
    );

    render(<StudentAssessmentCard assessment={assessment({ photos })} onOpenPhoto={onOpenPhoto} />);

    expect(screen.getByTestId('assessment-card-11111111-1111-4111-8111-111111111111')).toBeTruthy();
    expect(screen.getByTestId('student-assessment-photos')).toBeTruthy();

    for (const index of photos.keys()) {
      fireEvent.press(screen.getByRole('button', { name: `Abrir foto ${index + 1}` }));
      expect(onOpenPhoto).toHaveBeenLastCalledWith(index);
    }

    expect(screen.getAllByText(/^Foto \d+$/)).toHaveLength(8);
    expect(screen.queryByRole('button', { name: /Remover foto/ })).toBeNull();
  });
});
