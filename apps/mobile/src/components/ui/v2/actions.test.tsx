import { fireEvent, render, screen } from '@testing-library/react-native';
import { createRef } from 'react';
import { Text as NativeText, type View } from 'react-native';
import { describe, expect, it, vi } from 'vitest';
import { Button } from './button';
import { Card } from './card';
import { Header } from './header';
import { IconButton } from './icon-button';
import { SectionTab } from './section-tab';
import { Text } from './text';

describe('ações v2', () => {
  it.each(['primary', 'secondary', 'destructive', 'text', 'immersive'] as const)(
    'encaminha toque e foco na variante %s',
    (variant) => {
      const onPress = vi.fn();
      const onFocus = vi.fn();
      const onBlur = vi.fn();
      render(
        <Button
          label="Continuar"
          variant={variant}
          onPress={onPress}
          onFocus={onFocus}
          onBlur={onBlur}
        />,
      );
      const button = screen.getByRole('button', { name: 'Continuar' });
      fireEvent.press(button);
      fireEvent(button, 'focus', { nativeEvent: {} });
      expect(onPress).toHaveBeenCalledOnce();
      expect(onFocus).toHaveBeenCalledOnce();
      expect(screen.getByRole('button').props.className).toContain('border-2');
      fireEvent(button, 'blur', { nativeEvent: {} });
      expect(onBlur).toHaveBeenCalledOnce();
      expect(screen.getByRole('button').props.className).not.toContain('border-2');
    },
  );

  it.each([{ disabled: true }, { loading: true }, { disabled: true, loading: true }])(
    'bloqueia reentrada com %o e preserva o label longo',
    (state) => {
      const onPress = vi.fn();
      const label = 'Salvar todas as alterações e continuar meu treino';
      render(
        <Button
          {...state}
          label={label}
          onPress={onPress}
          accessibilityState={{ disabled: false, busy: false }}
        />,
      );
      const button = screen.getByRole('button', { name: label });
      fireEvent.press(button);
      expect(onPress).not.toHaveBeenCalled();
      expect(button.props.accessibilityState.disabled).toBe(true);
      expect(screen.getByText(label).props.numberOfLines).toBeUndefined();
      expect(screen.queryAllByRole('progressbar')).toHaveLength(state.loading ? 1 : 0);
    },
  );

  it('encaminha ref nativa e eventos de pressão', () => {
    const ref = createRef<View>();
    const node = { measure: vi.fn() };
    const onPressIn = vi.fn();
    const onPressOut = vi.fn();
    render(<Button ref={ref} label="Abrir" onPressIn={onPressIn} onPressOut={onPressOut} />, {
      createNodeMock: () => node,
    });
    expect(ref.current).toBe(node);
    fireEvent(screen.getByRole('button'), 'pressIn', { nativeEvent: {} });
    expect(onPressIn).toHaveBeenCalledOnce();
    expect(screen.getByRole('button').props.className).toContain('bg-v2-primaryPressed');
    fireEvent(screen.getByRole('button'), 'pressOut', { nativeEvent: {} });
    expect(onPressOut).toHaveBeenCalledOnce();
  });

  it('expõe nome do ícone e bloqueia toque durante loading', () => {
    const onPress = vi.fn();
    render(
      <IconButton
        accessibilityLabel="Atualizar"
        icon={<NativeText>ícone</NativeText>}
        loading
        onPress={onPress}
      />,
    );
    const button = screen.getByRole('button', { name: 'Atualizar' });
    fireEvent.press(button);
    expect(onPress).not.toHaveBeenCalled();
    expect(button.props.className).toContain('min-w-[48px]');
    expect(screen.getAllByRole('progressbar')).toHaveLength(1);
  });

  it('mantém spinner destrutivo contrastante durante loading', () => {
    render(
      <IconButton
        accessibilityLabel="Excluir série"
        variant="destructive"
        icon={<NativeText>ícone</NativeText>}
        loading
      />,
    );
    expect(screen.getByRole('progressbar').props.color).toBe('#FFFFFF');
  });

  it('mantém apresentação primária durante loading sem transformá-la em disabled', () => {
    const { rerender } = render(<Button label="Salvar" />);
    const normalClass = screen.getByRole('button').props.className;
    rerender(<Button label="Salvar" loading />);
    expect(screen.getByRole('button').props.className).toBe(normalClass);
    expect(screen.getByText('Salvar').props.className).toContain('text-center');
    expect(screen.getAllByRole('progressbar')).toHaveLength(1);
  });

  it('comunica seleção de tab e mantém eventos de foco', () => {
    const onPress = vi.fn();
    const onFocus = vi.fn();
    render(<SectionTab label="Avaliações" selected onPress={onPress} onFocus={onFocus} />);
    const tab = screen.getByRole('tab', { name: 'Avaliações' });
    expect(tab.props.accessibilityState.selected).toBe(true);
    fireEvent.press(tab);
    fireEvent(tab, 'focus', { nativeEvent: {} });
    expect(onPress).toHaveBeenCalledOnce();
    expect(onFocus).toHaveBeenCalledOnce();
  });

  it('só torna Card acionável quando recebe ação', () => {
    const onPress = vi.fn();
    const { rerender } = render(
      <Card>
        <Text>Dados</Text>
      </Card>,
    );
    expect(screen.queryByRole('button')).toBeNull();
    rerender(
      <Card action={{ label: 'Ver dados', onPress, disabled: true }}>
        <Text>Dados</Text>
      </Card>,
    );
    fireEvent.press(screen.getByRole('button', { name: 'Ver dados' }));
    expect(onPress).not.toHaveBeenCalled();
    rerender(
      <Card action={{ label: 'Ver dados', onPress }}>
        <Text>Dados</Text>
      </Card>,
    );
    fireEvent.press(screen.getByRole('button', { name: 'Ver dados' }));
    expect(onPress).toHaveBeenCalledOnce();
  });

  it('preserva padding interno de 16 dp no Card', () => {
    render(
      <Card testID="foundation-card">
        <Text>Dados</Text>
      </Card>,
    );
    expect(screen.getByTestId('foundation-card').props.className).toContain('p-4');
  });

  it('Header de sessão preserva título extenso e ações acessíveis', () => {
    const close = vi.fn();
    render(
      <Header
        title="Treino em execução com título extenso"
        variant="session"
        backAction={{ label: 'Fechar sessão', onPress: close }}
      />,
    );
    fireEvent.press(screen.getByRole('button', { name: 'Fechar sessão' }));
    expect(close).toHaveBeenCalledOnce();
    expect(
      screen.getByText('Treino em execução com título extenso').props.numberOfLines,
    ).toBeUndefined();
    expect(screen.getByRole('header')).toBeTruthy();
  });

  it('ações contextuais do Header encaminham retorno e atualização', () => {
    const back = vi.fn();
    const reload = vi.fn();
    render(
      <Header
        title="Avaliação"
        variant="contextual"
        backAction={{ label: 'Voltar', onPress: back }}
        action={{ label: 'Atualizar dados', onPress: reload }}
      />,
    );
    fireEvent.press(screen.getByRole('button', { name: 'Voltar' }));
    fireEvent.press(screen.getByRole('button', { name: 'Atualizar dados' }));
    expect(back).toHaveBeenCalledOnce();
    expect(reload).toHaveBeenCalledOnce();
  });

  it('aplica uma classe opcional somente ao título do Header', () => {
    render(<Header title="Alunos" titleClassName="text-[15px]" />);

    expect(screen.getByRole('header').props.className).toContain('text-[15px]');
  });

  it('compõe leading e label longo no Button e troca o leading por um único progresso', () => {
    const onPress = vi.fn();
    const label = 'Ver treinos e exercícios cadastrados';
    const { rerender } = render(
      <Button
        label={label}
        labelClassName="text-[14px]"
        leading={<NativeText testID="button-leading">ícone</NativeText>}
        onPress={onPress}
      />,
    );

    const button = screen.getByRole('button', { name: label });
    expect(screen.getByTestId('button-leading')).toBeTruthy();
    expect(screen.getByText(label).props.className).toContain('text-[14px]');
    expect(screen.getByText(label).props.numberOfLines).toBeUndefined();
    fireEvent.press(button);
    expect(onPress).toHaveBeenCalledOnce();

    rerender(
      <Button
        label={label}
        labelClassName="text-[14px]"
        leading={<NativeText testID="button-leading">ícone</NativeText>}
        loading
        onPress={onPress}
      />,
    );

    expect(screen.queryByTestId('button-leading')).toBeNull();
    expect(screen.getAllByRole('progressbar')).toHaveLength(1);
    fireEvent.press(screen.getByRole('button', { name: label }));
    expect(onPress).toHaveBeenCalledOnce();
  });

  it('Card imersivo mantém eventos nativos de foco e pressão', () => {
    const onFocus = vi.fn();
    const onBlur = vi.fn();
    const onPressIn = vi.fn();
    const onPressOut = vi.fn();
    render(
      <Card
        variant="immersive"
        action={{ label: 'Abrir série', onPress: vi.fn() }}
        onFocus={onFocus}
        onBlur={onBlur}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
      >
        <Text>Série</Text>
      </Card>,
    );
    const card = screen.getByRole('button', { name: 'Abrir série' });
    fireEvent(card, 'focus', { nativeEvent: {} });
    fireEvent(card, 'blur', { nativeEvent: {} });
    fireEvent(card, 'pressIn', { nativeEvent: {} });
    fireEvent(card, 'pressOut', { nativeEvent: {} });
    for (const callback of [onFocus, onBlur, onPressIn, onPressOut])
      expect(callback).toHaveBeenCalledOnce();
  });

  it('Card loading e tab com aria-disabled bloqueiam callbacks de ativação', () => {
    const onPress = vi.fn();
    render(
      <>
        <Card variant="highlight" action={{ label: 'Salvar destaque', onPress, loading: true }}>
          <Text>Destaque</Text>
        </Card>
        <SectionTab label="Medidas" aria-disabled onPress={onPress} />
      </>,
    );
    const card = screen.getByRole('button', { name: 'Salvar destaque' });
    const tab = screen.getByRole('tab', { name: 'Medidas' });
    fireEvent.press(card);
    fireEvent.press(tab);
    expect(card.props.accessibilityState.busy).toBe(true);
    expect(tab.props.accessibilityState.disabled).toBe(true);
    expect(onPress).not.toHaveBeenCalled();
  });

  it('IconButton secundário permite foco e mantém ação e label do consumidor', () => {
    const onPress = vi.fn();
    const onFocus = vi.fn();
    const onBlur = vi.fn();
    render(
      <IconButton
        accessibilityLabel="Favoritar"
        variant="secondary"
        icon={<NativeText>ícone</NativeText>}
        onPress={onPress}
        onFocus={onFocus}
        onBlur={onBlur}
      />,
    );
    const button = screen.getByRole('button', { name: 'Favoritar' });
    fireEvent(button, 'focus', { nativeEvent: {} });
    fireEvent(button, 'blur', { nativeEvent: {} });
    fireEvent.press(button);
    expect(onFocus).toHaveBeenCalledOnce();
    expect(onBlur).toHaveBeenCalledOnce();
    expect(onPress).toHaveBeenCalledOnce();
  });
});
