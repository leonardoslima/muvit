import { BottomTabBarHeightContext } from '@react-navigation/bottom-tabs';
import { render, screen, userEvent } from '@testing-library/react-native';
import { Modal, ScrollView, StyleSheet, Text } from 'react-native';
import { describe, expect, it, vi } from 'vitest';
import { colors, radii, spacing, typography } from '../../lib/styles';
import { BottomSheet } from './bottom-sheet';
import { AppButton } from './button';
import { Field } from './field';
import { InlineMessage } from './inline-message';
import { PressableCard } from './pressable-card';
import { Screen } from './screen';
import { StatePanel } from './state-panel';
import { StatusBadge } from './status-badge';

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

  it('mantém o limite editável do Field com contraste não textual mínimo', () => {
    render(<Field label="Email" onChangeText={() => undefined} value="" />);

    const inputStyle = StyleSheet.flatten(screen.getByLabelText('Email').props.style);
    const { borderColor } = inputStyle;

    expect(typeof borderColor).toBe('string');
    if (typeof borderColor !== 'string') {
      throw new Error('O Field deve renderizar uma cor de contorno.');
    }

    expect(getContrastRatio(borderColor, colors.surface)).toBeGreaterThanOrEqual(3);
    expect(getContrastRatio(borderColor, colors.background)).toBeGreaterThanOrEqual(3);
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

  it('mantém o shell compartilhado do bottom sheet e permite fechar pelo sistema', () => {
    const onClose = vi.fn();
    const onRequestClose = vi.fn();

    render(
      <BottomSheet onClose={onClose} onRequestClose={onRequestClose} visible>
        <Text>Conteúdo do sheet</Text>
      </BottomSheet>,
    );

    const modal = screen.UNSAFE_getByType(Modal);
    expect(modal.props).toMatchObject({
      animationType: 'slide',
      onRequestClose,
      transparent: true,
      visible: true,
    });
    expect(screen.getByText('Conteúdo do sheet')).toBeTruthy();

    const surface = modal.props.children.props.children;
    expect(StyleSheet.flatten(surface.props.style)).toMatchObject({
      backgroundColor: colors.surface,
      borderTopLeftRadius: radii.sheet,
      borderTopRightRadius: radii.sheet,
      gap: spacing.md,
      padding: spacing.xxl,
    });
  });

  it('não monta o conteúdo do bottom sheet quando está fechado', () => {
    render(
      <BottomSheet onClose={() => undefined} visible={false}>
        <Text>Conteúdo oculto</Text>
      </BottomSheet>,
    );

    expect(screen.queryByText('Conteúdo oculto')).toBeNull();
  });

  it('compõe um card pressionável com acessibilidade e feedback de pressão', async () => {
    const onPress = vi.fn();
    const user = userEvent.setup();

    render(
      <PressableCard accessibilityLabel="Abrir cartão" onPress={onPress}>
        <Text>Conteúdo do cartão</Text>
      </PressableCard>,
    );

    const card = screen.getByRole('button', { name: 'Abrir cartão' });
    expect(card.props.accessibilityState).toEqual({ disabled: false });
    expect(screen.getByText('Conteúdo do cartão')).toBeTruthy();

    const style = card.props.style;
    expect(typeof style).toBe('function');
    if (typeof style !== 'function') {
      throw new Error('O PressableCard deve expor o estado de pressão no estilo.');
    }

    expect(
      StyleSheet.flatten(style({ focused: false, hovered: false, pressed: true })),
    ).toMatchObject({
      borderRadius: radii.lg,
      opacity: 0.8,
    });

    await user.press(card);
    expect(onPress).toHaveBeenCalledOnce();
  });

  it('preserva o estado desabilitado do card pressionável', () => {
    render(
      <PressableCard accessibilityLabel="Cartão indisponível" disabled onPress={() => undefined}>
        <Text>Indisponível</Text>
      </PressableCard>,
    );

    const card = screen.getByRole('button', { name: 'Cartão indisponível' });
    expect(card.props.disabled).toBe(true);
    expect(card.props.accessibilityState).toEqual({ disabled: true });
  });

  it('renderiza o status badge genérico com tokens semânticos', () => {
    render(
      <StatusBadge
        backgroundColor={colors.primarySoft}
        label="Ativo"
        testID="shared-status-badge"
        textColor={colors.primaryText}
      />,
    );

    expect(screen.getByText('Ativo')).toBeTruthy();
    expect(StyleSheet.flatten(screen.getByTestId('shared-status-badge').props.style)).toMatchObject(
      {
        backgroundColor: colors.primarySoft,
        borderRadius: radii.pill,
        borderWidth: 0,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs,
      },
    );
    expect(StyleSheet.flatten(screen.getByText('Ativo').props.style)).toMatchObject({
      color: colors.primaryText,
    });
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

function getContrastRatio(firstColor: string, secondColor: string): number {
  const firstLuminance = getRelativeLuminance(firstColor);
  const secondLuminance = getRelativeLuminance(secondColor);
  const lighter = Math.max(firstLuminance, secondLuminance);
  const darker = Math.min(firstLuminance, secondLuminance);

  return (lighter + 0.05) / (darker + 0.05);
}

function getRelativeLuminance(hexColor: string): number {
  const red = getLinearChannel(hexColor.slice(1, 3));
  const green = getLinearChannel(hexColor.slice(3, 5));
  const blue = getLinearChannel(hexColor.slice(5, 7));

  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

function getLinearChannel(hexChannel: string): number {
  const channel = Number.parseInt(hexChannel, 16) / 255;

  return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
}
