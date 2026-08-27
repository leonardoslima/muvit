import { render, screen, userEvent } from '@testing-library/react-native';
import { ScrollView } from 'react-native';
import { describe, expect, it, vi } from 'vitest';
import { BottomTabBarHeightContext } from '../../../node_modules/@react-navigation/bottom-tabs/src/utils/BottomTabBarHeightContext';
import { spacing } from '../../lib/styles';
import { AppButton } from './button';
import { Field } from './field';
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

    expect(screen.getByLabelText('Email')).toBeTruthy();
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

  it('reserva espaço para a tab bar absoluta somente dentro das tabs', () => {
    const withTabs = render(
      <BottomTabBarHeightContext.Provider value={64}>
        <Screen scroll>Conteúdo</Screen>
      </BottomTabBarHeightContext.Provider>,
    );
    expect(withTabs.UNSAFE_getByType(ScrollView).props.contentContainerStyle).toEqual(
      expect.arrayContaining([expect.objectContaining({ paddingBottom: 64 + spacing.lg })]),
    );

    const outsideTabs = render(<Screen scroll>Conteúdo</Screen>);
    expect(outsideTabs.UNSAFE_getByType(ScrollView).props.contentContainerStyle).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ paddingBottom: 64 + spacing.lg })]),
    );
  });
});
