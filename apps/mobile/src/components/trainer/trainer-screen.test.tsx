import { fireEvent, render, screen } from '@testing-library/react-native';
import { describe, expect, it, vi } from 'vitest';
import { Text } from '../ui/v2/text';
import { TrainerScreen } from './trainer-screen';

vi.mock('react-native-safe-area-context', () => ({ SafeAreaView: 'View' }));

describe('TrainerScreen', () => {
  it('mantém header contextual e conteúdo durante a atualização sem reentrada', () => {
    const onBack = vi.fn();
    const onRefresh = vi.fn();
    const { rerender } = render(
      <TrainerScreen
        onBack={onBack}
        onRefresh={onRefresh}
        refreshDisabled={false}
        title="Alunos"
        contextual
      >
        <Text>Carteira carregada</Text>
      </TrainerScreen>,
    );

    expect(screen.getByRole('header', { name: 'Alunos' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Voltar para alunos' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Atualizar' })).toBeTruthy();
    expect(screen.getByText('Carteira carregada')).toBeTruthy();
    expect(screen.queryByText('Atualizando')).toBeNull();
    fireEvent.press(screen.getByRole('button', { name: 'Atualizar' }));
    expect(onRefresh).toHaveBeenCalledOnce();

    rerender(
      <TrainerScreen
        onBack={onBack}
        onRefresh={onRefresh}
        refreshDisabled
        refreshing
        title="Alunos"
        contextual
      >
        <Text>Carteira carregada</Text>
      </TrainerScreen>,
    );

    expect(screen.getByRole('header', { name: 'Alunos' })).toBeTruthy();
    expect(screen.getByText('Atualizando')).toBeTruthy();
    expect(screen.getByText('Aguarde enquanto os dados são atualizados.')).toBeTruthy();
    expect(screen.getAllByRole('progressbar')).toHaveLength(1);
    expect(screen.getByText('Carteira carregada')).toBeTruthy();
    expect(
      screen.getByRole('button', { name: 'Atualizar' }).props.accessibilityState.disabled,
    ).toBe(true);
    fireEvent.press(screen.getByRole('button', { name: 'Atualizar' }));
    fireEvent.press(screen.getByRole('button', { name: 'Voltar para alunos' }));
    expect(onRefresh).toHaveBeenCalledOnce();
    expect(onBack).toHaveBeenCalledOnce();
  });

  it('mantém o header em estados iniciais de loading e erro fornecidos pelo chamador', () => {
    const { rerender } = render(
      <TrainerScreen title="Início" onRefresh={() => undefined} refreshDisabled>
        <Text accessibilityRole="progressbar">Carregando visão geral</Text>
      </TrainerScreen>,
    );

    expect(screen.getByRole('header', { name: 'Início' })).toBeTruthy();
    expect(
      screen.getByRole('button', { name: 'Atualizar' }).props.accessibilityState.disabled,
    ).toBe(true);

    rerender(
      <TrainerScreen title="Início" onRefresh={() => undefined} refreshDisabled={false}>
        <Text accessibilityRole="alert">Não foi possível carregar</Text>
      </TrainerScreen>,
    );

    expect(screen.getByRole('header', { name: 'Início' })).toBeTruthy();
    expect(screen.getByRole('alert')).toBeTruthy();
    expect(
      screen.getByRole('button', { name: 'Atualizar' }).props.accessibilityState.disabled,
    ).toBe(false);
  });

  it('reduz o título principal quando a largura disponível é de 320 dp', () => {
    render(
      <TrainerScreen title="Início" onRefresh={() => undefined} refreshDisabled>
        <Text>Carteira</Text>
      </TrainerScreen>,
    );

    fireEvent(screen.getByTestId('trainer-screen-content'), 'layout', {
      nativeEvent: { layout: { width: 320, height: 600, x: 0, y: 0 } },
    });

    expect(screen.getByRole('header', { name: 'Início' }).props.className).toContain('text-[26px]');
  });
});
