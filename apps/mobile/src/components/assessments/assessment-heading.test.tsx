import { fireEvent, render, screen } from '@testing-library/react-native';
import { describe, expect, it } from 'vitest';
import { AssessmentHeading } from './assessment-heading';

describe('AssessmentHeading', () => {
  it('usa título de 26 dp quando a largura disponível é de até 320 dp', () => {
    render(<AssessmentHeading title="Avaliações" subtitle="Histórico do aluno." />);

    fireEvent(screen.getByTestId('assessment-heading'), 'layout', {
      nativeEvent: { layout: { width: 288, height: 80, x: 0, y: 0 } },
    });

    const title = screen.getByRole('header', { name: 'Avaliações' });
    expect(title.props.className).toContain('text-[26px]');
    expect(title.props.numberOfLines).toBeUndefined();
    expect(screen.getByText('Histórico do aluno.')).toBeTruthy();
  });

  it('usa título de 30 dp acima de 320 dp e permite quebra de texto', () => {
    render(<AssessmentHeading title="Avaliações" subtitle="Histórico do aluno." />);

    fireEvent(screen.getByTestId('assessment-heading'), 'layout', {
      nativeEvent: { layout: { width: 358, height: 80, x: 0, y: 0 } },
    });

    const title = screen.getByRole('header', { name: 'Avaliações' });
    expect(title.props.className).toContain('text-[30px]');
    expect(title.props.numberOfLines).toBeUndefined();
    expect(screen.getByText('Histórico do aluno.')).toBeTruthy();
  });
});
