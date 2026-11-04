import { act, fireEvent, render, screen, within } from '@testing-library/react-native';
import { View } from 'react-native';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ActionFeedback } from './action-feedback';
import { ToastProvider } from './toast';

vi.mock('react-native-safe-area-context', () => ({ SafeAreaView: 'View' }));

afterEach(() => vi.useRealTimers());

describe('Toast de erro', () => {
  it('mantém falhas de carregamento sem conteúdo no contexto', () => {
    render(<ActionFeedback inline variant="error" title="Não foi possível carregar sua meta" />);
    expect(screen.getByText('Não foi possível carregar sua meta')).toBeTruthy();
    expect(screen.queryByTestId('toast-overlay')).toBeNull();
  });

  it('mostra somente a mensagem mais recente e não a remove ao desmontar outra origem', () => {
    const { rerender } = render(
      <ToastProvider>
        <ActionFeedback key="first" title="Primeira falha" variant="error" />
        <ActionFeedback key="last" title="Falha mais recente" variant="error" />
      </ToastProvider>,
    );
    expect(screen.queryByText('Primeira falha')).toBeNull();
    expect(screen.getByText('Falha mais recente')).toBeTruthy();
    rerender(
      <ToastProvider>
        <ActionFeedback key="last" title="Falha mais recente" variant="error" />
      </ToastProvider>,
    );
    expect(screen.getByText('Falha mais recente')).toBeTruthy();
  });

  it('flutua fora do conteúdo e permite fechar sem bloquear a tela', () => {
    render(
      <ToastProvider>
        <View testID="content">
          <ActionFeedback title="Falha ao salvar" variant="error" />
        </View>
      </ToastProvider>,
    );
    const overlay = screen.getByTestId('toast-overlay');
    expect(overlay.props.pointerEvents).toBe('box-none');
    expect(overlay.props.style.position).toBe('absolute');
    expect(within(screen.getByTestId('content')).queryByText('Falha ao salvar')).toBeNull();
    expect(screen.getByRole('alert').props.accessibilityLabel).toBe('Falha ao salvar');
    fireEvent.press(screen.getByRole('button', { name: 'Fechar mensagem' }));
    expect(screen.queryByText('Falha ao salvar')).toBeNull();
  });

  it('desaparece após cinco segundos e não reaparece em rerenders comuns', async () => {
    vi.useFakeTimers();
    const { rerender } = render(
      <ToastProvider>
        <ActionFeedback title="Falha ao salvar" variant="error" />
      </ToastProvider>,
    );
    await act(async () => {
      await vi.advanceTimersByTimeAsync(4999);
    });
    expect(screen.getByText('Falha ao salvar')).toBeTruthy();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });
    expect(screen.queryByText('Falha ao salvar')).toBeNull();
    rerender(
      <ToastProvider>
        <ActionFeedback title="Falha ao salvar" variant="error" />
      </ToastProvider>,
    );
    expect(screen.queryByText('Falha ao salvar')).toBeNull();
  });

  it('uma nova falha igual reaparece com outra ocorrência', () => {
    const { rerender } = render(
      <ToastProvider>
        <ActionFeedback eventKey={1} title="Falha ao salvar" variant="error" />
      </ToastProvider>,
    );
    fireEvent.press(screen.getByRole('button', { name: 'Fechar mensagem' }));
    rerender(
      <ToastProvider>
        <ActionFeedback eventKey={2} title="Falha ao salvar" variant="error" />
      </ToastProvider>,
    );
    expect(screen.getByText('Falha ao salvar')).toBeTruthy();
  });

  it('limpa a mensagem quando sua origem desmonta', () => {
    const { rerender } = render(
      <ToastProvider>
        <ActionFeedback title="Falha ao salvar" variant="error" />
      </ToastProvider>,
    );
    rerender(
      <ToastProvider>
        <View />
      </ToastProvider>,
    );
    expect(screen.queryByText('Falha ao salvar')).toBeNull();
  });

  it('preserva a ação de tentar novamente e as mensagens que continuam inline', () => {
    const retry = vi.fn();
    render(
      <ToastProvider>
        <ActionFeedback
          title="Falha ao salvar"
          variant="error"
          action={{ label: 'Tentar novamente', onPress: retry }}
        />
        <ActionFeedback title="Salvo neste aparelho" variant="warning" />
      </ToastProvider>,
    );
    fireEvent.press(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(retry).toHaveBeenCalledOnce();
    expect(screen.getByText('Salvo neste aparelho')).toBeTruthy();
  });
});
