import { fireEvent, render, screen } from '@testing-library/react-native';
import { describe, expect, it, vi } from 'vitest';
import { Badge } from './badge';
import { Message } from './message';
import { SheetSurface } from './sheet-surface';
import { Skeleton } from './skeleton';
import { StatePanel } from './state-panel';
import { Surface } from './surface';
import { Text, TextClassContext } from './text';

describe('feedback e superfícies v2', () => {
  it('Message error sem título anuncia somente a descrição com região polite', () => {
    const description = 'Não foi possível sair agora.';
    render(<Message variant="error" description={description} testID="message" />);

    expect(screen.getAllByText(description)).toHaveLength(1);
    expect(screen.getByRole('alert')).toBe(screen.getByText(description));
    expect(screen.getByTestId('message').props.accessibilityLiveRegion).toBe('polite');
    expect(screen.queryByText('Erro')).toBeNull();
  });

  it.each(['success', 'warning', 'error', 'info'] as const)(
    'Message %s preserva descrição e ação do caller',
    (variant) => {
      const onPress = vi.fn();
      render(
        <Message
          variant={variant}
          title="Atualização do treino"
          description="Uma descrição extensa pode ocupar várias linhas sem perder informações importantes."
          action={{ label: 'Ver detalhes', onPress }}
        />,
      );
      expect(screen.getByText('Atualização do treino')).toBeTruthy();
      expect(screen.getByText(/Uma descrição extensa/).props.numberOfLines).toBeUndefined();
      if (variant === 'error') expect(screen.getByRole('alert')).toBeTruthy();
      fireEvent.press(screen.getByRole('button', { name: 'Ver detalhes' }));
      expect(onPress).toHaveBeenCalledOnce();
    },
  );

  it.each(['active', 'inactive', 'pending', 'error'] as const)(
    'Badge %s comunica status com texto acessível',
    (variant) => {
      render(<Badge variant={variant} label="Status do treino" />);
      expect(screen.getByLabelText('Status do treino')).toBeTruthy();
      expect(screen.getByText('Status do treino').props.numberOfLines).toBeUndefined();
    },
  );

  it('StatePanel loading mantém um único progresso e remove retry', () => {
    render(
      <StatePanel
        kind="loading"
        title="Carregando treinos"
        description="Aguarde um instante."
        action={{ label: 'Tentar novamente', onPress: vi.fn(), loading: true }}
        testID="state"
      />,
    );
    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.getAllByRole('progressbar')).toHaveLength(1);
    expect(screen.getByTestId('state').props.className).not.toContain('bg-v2-surface');
    expect(screen.getByTestId('state').props.style).toBeUndefined();
  });

  it.each(['empty', 'error', 'success'] as const)(
    'StatePanel %s permite ação e crescimento do conteúdo',
    (kind) => {
      const retry = vi.fn();
      render(
        <StatePanel
          kind={kind}
          title="Situação do treino"
          description="Descrição que permanece acessível."
          action={{ label: 'Continuar', onPress: retry }}
        />,
      );
      fireEvent.press(screen.getByRole('button', { name: 'Continuar' }));
      expect(retry).toHaveBeenCalledOnce();
      expect(
        screen.getByText('Descrição que permanece acessível.').props.numberOfLines,
      ).toBeUndefined();
    },
  );

  it('Text combina contexto e variante sem restringir escala nativa', () => {
    render(
      <TextClassContext.Provider value="text-v2-sessionText">
        <Text variant="sectionTitle">Título extenso</Text>
      </TextClassContext.Provider>,
    );
    const text = screen.getByText('Título extenso');
    expect(text.props.className).toContain('text-v2-sessionText');
    expect(text.props.allowFontScaling).not.toBe(false);
    expect(text.props.numberOfLines).toBeUndefined();
  });

  it('superfícies preservam filhos e contexto imersivo sem modal', () => {
    render(
      <Surface variant="immersive" testID="surface">
        <Text>Superfície</Text>
        <SheetSurface testID="sheet">
          <Text>Conteúdo da sheet</Text>
        </SheetSurface>
        <Skeleton testID="skeleton" />
      </Surface>,
    );
    expect(screen.getByTestId('surface').props.className).toContain('bg-v2-sessionSurface');
    expect(screen.getByText('Superfície').props.className).toContain('text-v2-sessionText');
    expect(screen.getByText('Conteúdo da sheet').props.className).toContain('text-v2-text');
    expect(screen.getByTestId('sheet').props.className).toContain('rounded-t-[24px]');
    expect(
      screen.getByTestId('skeleton', { includeHiddenElements: true }).props
        .importantForAccessibility,
    ).toBe('no-hide-descendants');
  });
});
