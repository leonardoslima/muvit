import { BottomTabBarHeightContext } from '@react-navigation/bottom-tabs';
import { render, screen, userEvent } from '@testing-library/react-native';
import { ScrollView, StyleSheet } from 'react-native';
import { describe, expect, it, vi } from 'vitest';
import { colors, spacing, typography } from '../../lib/styles';
import { AppButton } from './button';
import { Field } from './field';
import { InlineMessage } from './inline-message';
import { Screen } from './screen';
import { StatePanel } from './state-panel';

vi.mock('react-native-safe-area-context', () => ({ SafeAreaView: 'SafeAreaView' }));

describe('componentes visuais mobile', () => {
  it('expõe label, estado e ação de forma acessível', async () => {
    const retry = vi.fn();
    const user = userEvent.setup();

    render(
      <>
        <Field label="Email" onChangeText={() => undefined} value="" />
        <StatePanel
          actionLabel="Tentar novamente"
          description="Não foi possível carregar seus dados."
          onAction={retry}
          title="Algo deu errado"
          tone="error"
        />
      </>,
    );

    const emailInput = screen.getByLabelText('Email');
    expect(emailInput).toBeTruthy();
    expect(StyleSheet.flatten(emailInput.props.style)).toMatchObject(typography.input);

    const stateTitle = screen.getByText('Algo deu errado');
    expect(StyleSheet.flatten(stateTitle.props.style)).toMatchObject({ color: colors.ink });

    await user.press(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(retry).toHaveBeenCalledOnce();
  });

  it('impede toque duplicado durante submissão', async () => {
    const submit = vi.fn();
    const user = userEvent.setup();
    render(<AppButton disabled label="Entrando..." onPress={submit} />);

    await user.press(screen.getByRole('button', { name: 'Entrando...' }));
    expect(submit).not.toHaveBeenCalled();
  });

  it('apresenta feedback inline com semântica e tom visual', () => {
    render(<InlineMessage message="Não foi possível salvar." tone="error" />);

    const message = screen.getByTestId('inline-message');
    const style = StyleSheet.flatten(message.props.style);

    expect(screen.getByRole('alert')).toBeTruthy();
    expect(screen.getByText('Não foi possível salvar.')).toBeTruthy();
    expect(style).toMatchObject({
      backgroundColor: colors.dangerSoft,
      borderColor: colors.danger,
    });
  });

  it('reserva espaço da tab bar e preserva os estilos fornecidos', () => {
    const callerStyle = {
      backgroundColor: '#ffffff',
      paddingBottom: 8,
      paddingHorizontal: 12,
    };
    const withTabs = render(
      <BottomTabBarHeightContext.Provider value={64}>
        <Screen contentContainerStyle={callerStyle} scroll>
          Conteúdo
        </Screen>
      </BottomTabBarHeightContext.Provider>,
    );
    const withTabsStyle = StyleSheet.flatten(
      withTabs.UNSAFE_getByType(ScrollView).props.contentContainerStyle,
    );
    expect(withTabsStyle).toEqual(
      expect.objectContaining({
        backgroundColor: callerStyle.backgroundColor,
        paddingBottom: 64 + spacing.lg,
        paddingHorizontal: callerStyle.paddingHorizontal,
      }),
    );

    const withZeroTabBar = render(
      <BottomTabBarHeightContext.Provider value={0}>
        <Screen contentContainerStyle={callerStyle} scroll>
          Conteúdo
        </Screen>
      </BottomTabBarHeightContext.Provider>,
    );
    const withZeroTabBarStyle = StyleSheet.flatten(
      withZeroTabBar.UNSAFE_getByType(ScrollView).props.contentContainerStyle,
    );
    expect(withZeroTabBarStyle.paddingBottom).toBe(spacing.lg);

    const outsideTabs = render(
      <Screen contentContainerStyle={callerStyle} scroll>
        Conteúdo
      </Screen>,
    );
    const outsideTabsStyle = StyleSheet.flatten(
      outsideTabs.UNSAFE_getByType(ScrollView).props.contentContainerStyle,
    );
    expect(outsideTabsStyle).toEqual(expect.objectContaining(callerStyle));
    expect(outsideTabsStyle.paddingBottom).toBe(callerStyle.paddingBottom);
  });
});
