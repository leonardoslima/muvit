import { fireEvent, render, screen, userEvent } from '@testing-library/react-native';
import { StyleSheet, Text } from 'react-native';
import { describe, expect, it, vi } from 'vitest';
import {
  colors,
  controlSizes,
  fontFamilies,
  sharedStyles,
  spacing,
  typography,
} from '../../lib/styles';
import { ContextualHeader, HeaderAction, PageHeader, SessionHeader } from './header';

describe('headers compartilhados', () => {
  it('renderiza o header vertical de página com hierarquia e ação semântica', async () => {
    const onPress = vi.fn();

    render(
      <PageHeader
        action={
          <HeaderAction accessibilityLabel="Nova avaliação" onPress={onPress} testID="page-action">
            <Text accessible={false}>+</Text>
          </HeaderAction>
        }
        eyebrow="PROGRESSO"
        subtitle="Sua evolução, avaliação por avaliação."
        title="Progresso"
      />,
    );

    expect(screen.getByRole('header', { name: 'Progresso' })).toBeTruthy();
    expect(screen.getByText('PROGRESSO')).toBeTruthy();
    expect(screen.getByText('Sua evolução, avaliação por avaliação.')).toBeTruthy();

    const titleStyle = StyleSheet.flatten(
      screen.getByRole('header', { name: 'Progresso' }).props.style,
    );
    expect(titleStyle).toMatchObject(sharedStyles.title);

    const action = screen.getByRole('button', { name: 'Nova avaliação' });
    expect(action.props.accessibilityState).toEqual({ disabled: false });
    expect(getPressableStyle(action)).toMatchObject({
      minHeight: controlSizes.touchTarget,
      minWidth: controlSizes.touchTarget,
      height: controlSizes.touchTarget,
      width: controlSizes.touchTarget,
      padding: spacing.xs,
    });

    fireEvent.press(action);
    expect(onPress).toHaveBeenCalledOnce();
  });

  it('renderiza o header contextual com voltar, título e ação desabilitável', async () => {
    const onBack = vi.fn();
    const onAction = vi.fn();
    const user = userEvent.setup();

    render(
      <ContextualHeader
        action={
          <HeaderAction
            accessibilityLabel="Atualizando..."
            disabled
            onPress={onAction}
            testID="contextual-action"
          >
            <Text accessible={false}>↻</Text>
          </HeaderAction>
        }
        backAccessibilityLabel="Voltar para avaliações"
        backIcon={<Text accessible={false}>back</Text>}
        onBack={onBack}
        backTestID="contextual-back"
        eyebrow="HISTÓRICO"
        testID="contextual-header"
        titleTestID="contextual-title"
        subtitle="Acompanhe a evolução"
        title="Avaliações"
      />,
    );

    expect(screen.getByTestId('contextual-header')).toBeTruthy();
    expect(screen.getByTestId('contextual-back')).toBeTruthy();
    expect(screen.getByTestId('contextual-title')).toBeTruthy();
    expect(screen.getByTestId('contextual-title').props.numberOfLines).toBeUndefined();
    expect(screen.getByText('HISTÓRICO')).toBeTruthy();
    expect(screen.getByText('Acompanhe a evolução')).toBeTruthy();
    expect(screen.getByRole('header', { name: 'Avaliações' })).toBeTruthy();
    const back = screen.getByRole('button', { name: 'Voltar para avaliações' });
    const action = screen.getByRole('button', { name: 'Atualizando...' });

    expect(getPressableStyle(back)).toMatchObject({
      minHeight: controlSizes.touchTarget,
      minWidth: controlSizes.touchTarget,
      height: controlSizes.touchTarget,
      width: controlSizes.touchTarget,
    });
    expect(action.props.accessibilityState).toEqual({ disabled: true });
    expect(getPressableStyle(action)).toMatchObject({
      minHeight: controlSizes.touchTarget,
      minWidth: controlSizes.touchTarget,
      height: controlSizes.touchTarget,
      width: controlSizes.touchTarget,
    });

    await user.press(back);
    await user.press(action);
    expect(onBack).toHaveBeenCalledOnce();
    expect(onAction).not.toHaveBeenCalled();
  });

  it('mantém o título centralizado no header de sessão guiada', () => {
    const onBack = vi.fn();

    render(
      <SessionHeader
        backIcon={<Text accessible={false}>back</Text>}
        disabled={false}
        onBack={onBack}
        showBack
        testID="session-header"
        titleTestID="session-header-title"
        title="Treino em andamento"
      />,
    );

    const title = screen.getByRole('header', { name: 'Treino em andamento' });
    const back = screen.getByRole('button', { name: 'Voltar' });

    expect(title.props.numberOfLines).toBeUndefined();
    expect(StyleSheet.flatten(title.props.style)).toMatchObject({
      color: colors.ink,
      fontFamily: fontFamilies.heading,
      fontSize: typography.sessionTitle.fontSize,
      textAlign: 'center',
    });
    expect(getPressableStyle(back)).toMatchObject({
      minHeight: controlSizes.touchTarget,
      minWidth: controlSizes.touchTarget,
      height: controlSizes.touchTarget,
      width: controlSizes.touchTarget,
    });
    expect(screen.getByTestId('session-header')).toBeTruthy();
    expect(screen.getByTestId('session-header-title')).toBeTruthy();

    fireEvent.press(back);
    expect(onBack).toHaveBeenCalledOnce();
  });
});

function getPressableStyle(element: { props: { style: unknown } }) {
  if (typeof element.props.style !== 'function') {
    throw new Error('O HeaderAction deve expor o estado de pressão no estilo.');
  }

  return StyleSheet.flatten(element.props.style({ pressed: false }));
}
