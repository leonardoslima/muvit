import { render, screen, userEvent } from '@testing-library/react-native';
import { createElement } from 'react';
import { StyleSheet } from 'react-native';
import { describe, expect, it, vi } from 'vitest';
import { AssessmentListItem } from './assessment-list-item';

vi.mock('@expo/vector-icons', () => ({
  Ionicons: (props: Record<string, unknown>) => createElement('Ionicons', props),
}));

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
  it('alinha o card compacto ao layout do histórico do treinador', () => {
    render(<AssessmentListItem assessment={assessment} onPress={() => undefined} />);

    expect(
      StyleSheet.flatten(screen.getByTestId('assessment-list-card').props.style),
    ).toMatchObject({
      borderRadius: 8,
      gap: 8,
      padding: 16,
    });
    expect(
      StyleSheet.flatten(screen.getByTestId('assessment-list-header').props.style),
    ).toMatchObject({ gap: 10 });
    expect(
      StyleSheet.flatten(screen.getByText('Avaliação de 3 de setembro').props.style),
    ).toMatchObject({
      fontSize: 16,
      fontWeight: '700',
    });
    expect(screen.getByTestId('assessment-list-icon').props.color).toBe('#3498DB');
    expect(StyleSheet.flatten(screen.getByText('18,4%').props.style)).toMatchObject({
      fontSize: 18,
      fontWeight: '700',
    });
  });

  it('prioriza a data legível e o resumo de evolução no card', () => {
    render(<AssessmentListItem assessment={assessment} onPress={() => undefined} />);

    expect(screen.getByText('Avaliação de 3 de setembro')).toBeTruthy();
    expect(screen.getByText('3 set 2026')).toBeTruthy();
    expect(screen.getByText('Gordura corporal')).toBeTruthy();
    expect(screen.getByText('82,5 kg')).toBeTruthy();
    expect(screen.getByText(/Boa evolução/)).toBeTruthy();
  });

  it('renderiza resumo acessível e dispara abertura', async () => {
    const onPress = vi.fn();
    const user = userEvent.setup();

    render(<AssessmentListItem assessment={assessment} onPress={onPress} />);

    expect(screen.getByText('3 set 2026')).toBeTruthy();
    expect(screen.getByText('82,5 kg')).toBeTruthy();
    expect(screen.getByText('18,4%')).toBeTruthy();
    expect(screen.getByText(/Boa evolução/)).toBeTruthy();

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
