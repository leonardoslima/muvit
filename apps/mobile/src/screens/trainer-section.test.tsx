import { render, screen } from '@testing-library/react-native';
import { describe, expect, it, vi } from 'vitest';
import { TrainerSectionScreen } from './trainer-section';

vi.mock('react-native-safe-area-context', () => ({
  SafeAreaView: 'View',
}));

describe('TrainerSectionScreen', () => {
  it('renderiza uma seção de treinador sem dependências de domínio', () => {
    render(
      <TrainerSectionScreen
        stateDescription="Consulte seus alunos por aqui."
        stateTitle="Acompanhamento"
        subtitle="Sua operação no Muvit."
        title="Alunos"
      />,
    );

    expect(screen.getByRole('header', { name: 'Alunos' })).toBeTruthy();
    expect(screen.getByText('Sua operação no Muvit.')).toBeTruthy();
    expect(screen.getByText('Acompanhamento')).toBeTruthy();
    expect(screen.getByText('Consulte seus alunos por aqui.')).toBeTruthy();
  });
});
