import { render, screen, userEvent } from '@testing-library/react-native';
import { describe, expect, it, vi } from 'vitest';
import { AssessmentListItem } from './assessment-list-item';

const assessment = {
  id: 'assessment-1',
  studentId: 'student-1',
  date: '2026-09-03',
  weightKg: '82.5',
  heightCm: null,
  bodyFatPct: '18.4',
  measurements: null,
  photos: null,
  notes: 'Boa evolução',
  createdAt: '2026-09-03T12:00:00.000Z',
};

describe('AssessmentListItem', () => {
  it('renderiza resumo acessível e dispara abertura', async () => {
    const onPress = vi.fn();
    const user = userEvent.setup();

    render(<AssessmentListItem assessment={assessment} onPress={onPress} />);

    expect(screen.getByText('03/09/2026')).toBeTruthy();
    expect(screen.getByText('82,5 kg')).toBeTruthy();
    expect(screen.getByText('18,4%')).toBeTruthy();
    expect(screen.getByText('Boa evolução')).toBeTruthy();

    expect(screen.getAllByRole('button')).toHaveLength(1);
    await user.press(
      screen.getByRole('button', {
        name: 'Abrir avaliação de 03/09/2026, peso: 82,5 kg, gordura corporal: 18,4%, observações: Boa evolução',
      }),
    );
    expect(onPress).toHaveBeenCalledOnce();
  });

  it('exibe fallback para métricas ausentes', () => {
    render(
      <AssessmentListItem
        assessment={{ ...assessment, bodyFatPct: null, weightKg: null, notes: null }}
        onPress={() => undefined}
      />,
    );

    expect(screen.getAllByText('Não informado')).toHaveLength(2);
    expect(screen.queryByText('Boa evolução')).toBeNull();
    expect(
      screen.getByRole('button', {
        name: 'Abrir avaliação de 03/09/2026, peso: Não informado, gordura corporal: Não informado',
      }),
    ).toBeTruthy();
  });
});
