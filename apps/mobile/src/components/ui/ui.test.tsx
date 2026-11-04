import { BottomTabBarHeightContext } from '@react-navigation/bottom-tabs';
import { render, screen, userEvent } from '@testing-library/react-native';
import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { describe, expect, it, vi } from 'vitest';
import { colors as designColors, spacing as designSpacing } from '../../lib/design-system/tokens';
import { colors, spacing, typography } from '../../lib/styles';
import { AppButton } from './button';
import { Field } from './field';
import { InlineMessage } from './inline-message';
import { Screen, ScreenHeader } from './screen';
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

  it('desabilita a ação do painel durante uma operação', async () => {
    const retry = vi.fn();
    const user = userEvent.setup();

    render(
      <StatePanel
        actionDisabled
        actionLabel="Tentar novamente"
        description="Não foi possível carregar seus dados."
        onAction={retry}
        title="Algo deu errado"
        tone="error"
      />,
    );

    const retryButton = screen.getByRole('button', { name: 'Tentar novamente' });
    expect(retryButton.props.accessibilityState).toEqual(
      expect.objectContaining({ disabled: true }),
    );

    await user.press(retryButton);
    expect(retry).not.toHaveBeenCalled();
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
        paddingBottom: 64 + designSpacing.lg + designSpacing.xxl,
        paddingHorizontal: callerStyle.paddingHorizontal,
      }),
    );
  });

  it('mantém a compensação da barra flutuante e a folga com altura de tab bar zero', () => {
    const callerStyle = {
      backgroundColor: '#ffffff',
      paddingBottom: 8,
      paddingHorizontal: 12,
    };
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
    expect(withZeroTabBarStyle.paddingBottom).toBe(designSpacing.lg + designSpacing.xxl);
  });

  it('preserva os estilos fornecidos fora das tabs', () => {
    const callerStyle = {
      backgroundColor: '#ffffff',
      paddingBottom: 8,
      paddingHorizontal: 12,
    };
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

  it('retira o inset inferior da safe area quando a tab bar já o reserva', () => {
    const insideTabs = render(
      <BottomTabBarHeightContext.Provider value={101}>
        <Screen scroll>Conteúdo</Screen>
      </BottomTabBarHeightContext.Provider>,
    );
    const insideSafeArea = insideTabs.UNSAFE_getByType(SafeAreaView);
    const content = StyleSheet.flatten(
      insideTabs.UNSAFE_getByType(ScrollView).props.contentContainerStyle,
    );

    expect(insideSafeArea.props.edges).toEqual(['top', 'left', 'right']);
    expect(StyleSheet.flatten(insideSafeArea.props.style).backgroundColor).toBe(
      designColors.background,
    );
    expect(content).toEqual(
      expect.objectContaining({
        gap: designSpacing.lg,
        paddingBottom: 101 + designSpacing.lg + designSpacing.xxl,
        paddingHorizontal: designSpacing.lg,
        paddingVertical: designSpacing.xxl,
      }),
    );
  });

  it('preserva todos os insets da safe area fora das tabs', () => {
    const outsideTabs = render(<Screen scroll>Conteúdo</Screen>);
    expect(outsideTabs.UNSAFE_getByType(SafeAreaView).props.edges).toEqual([
      'top',
      'right',
      'bottom',
      'left',
    ]);
  });

  it('reserva a tab bar também em telas não roláveis dentro das tabs', () => {
    const insideTabs = render(
      <BottomTabBarHeightContext.Provider value={101}>
        <Screen style={{ justifyContent: 'center' }}>Estado</Screen>
      </BottomTabBarHeightContext.Provider>,
    );
    const safeArea = insideTabs.UNSAFE_getByType(SafeAreaView);
    const style = StyleSheet.flatten(safeArea.props.style);

    expect(safeArea.props.edges).toEqual(['top', 'left', 'right']);
    expect(style.paddingBottom).toBe(101 + designSpacing.lg + designSpacing.xxl);
  });

  it('usa o Header v2 e preserva contexto e subtítulo do cabeçalho compartilhado', () => {
    render(<ScreenHeader eyebrow="Aluno" subtitle="Informações da sua conta." title="Perfil" />);

    expect(screen.getByRole('header').props.className).toContain('text-[30px]');
    expect(screen.getByText('Aluno').props.className).toContain('text-v2-brand');
    expect(screen.getByText('Informações da sua conta.').props.className).toContain(
      'text-v2-secondary',
    );
  });
});
