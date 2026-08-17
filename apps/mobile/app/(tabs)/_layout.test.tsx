import { render } from '@testing-library/react-native';
import React, { type ReactNode } from 'react';
import { StyleSheet } from 'react-native';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { colors, radii } from '../../src/lib/styles';
import TabsLayout from './_layout';

type TabIconProps = {
  color: string;
  focused: boolean;
  size: number;
};

type TabScreen = {
  name: string;
  options: {
    tabBarActiveBackgroundColor?: string;
    tabBarIcon?: (props: TabIconProps) => React.ReactElement<{ name: string }>;
    tabBarLabel?: string;
    title?: string;
  };
};

type TabBarButtonProps = {
  children: ReactNode;
  style?: unknown;
  [key: string]: unknown;
};

const tabsState = vi.hoisted(() => ({
  screenOptions: null as Record<string, unknown> | null,
  screens: [] as TabScreen[],
}));

vi.mock('expo-router', () => {
  const Tabs = Object.assign(
    ({
      children,
      screenOptions,
    }: { children: ReactNode; screenOptions: Record<string, unknown> }) => {
      tabsState.screenOptions = screenOptions;
      return React.createElement('View', null, children);
    },
    {
      Screen: ({ name, options }: TabScreen) => {
        tabsState.screens.push({ name, options });
        return null;
      },
    },
  );

  return { Tabs };
});

vi.mock('@expo/vector-icons', () => ({
  Ionicons: (props: { name: string; color: string; size: number }) =>
    React.createElement('Ionicons', props),
}));

describe('TabsLayout', () => {
  beforeEach(() => {
    tabsState.screenOptions = null;
    tabsState.screens.length = 0;
  });

  it('aplica fundo ativo e recorte em pill a todas as abas', () => {
    const tabsRender = render(<TabsLayout />);

    const screenOptions = tabsState.screenOptions;
    if (!screenOptions) {
      throw new Error('As opções das abas não foram capturadas');
    }

    expect(screenOptions.tabBarActiveBackgroundColor).toBe(colors.primarySoft);
    expect(screenOptions.tabBarItemStyle).toEqual({
      borderRadius: radii.pill,
    });
    expect(screenOptions.tabBarItemStyle).not.toHaveProperty('overflow');
    expect(screenOptions.tabBarStyle).toMatchObject({
      borderRadius: radii.pill,
    });
    expect(screenOptions.tabBarAllowFontScaling).not.toBe(false);

    const tabBarButton = screenOptions.tabBarButton as
      | ((props: TabBarButtonProps) => React.ReactElement<TabBarButtonProps>)
      | undefined;
    if (!tabBarButton) {
      throw new Error('Botão customizado das abas não foi capturado');
    }

    for (const { name, options } of tabsState.screens) {
      const onPress = vi.fn();
      const onLongPress = vi.fn();
      const activeButton = tabBarButton({
        'aria-label': options.tabBarLabel,
        'aria-selected': true,
        android_ripple: { borderless: true },
        children: React.createElement('Text', null, options.tabBarLabel),
        href: `/${name}`,
        onLongPress,
        onPress,
        role: 'tab',
        style: { backgroundColor: colors.primarySoft, borderRadius: 0 },
        testID: `tab-${name}`,
      });
      const activeStyle = StyleSheet.flatten(activeButton.props.style) as
        | Record<string, unknown>
        | undefined;

      expect(activeStyle).toMatchObject({
        backgroundColor: colors.primarySoft,
        borderRadius: radii.pill,
      });
      expect(activeStyle).not.toHaveProperty('overflow');
      expect(activeButton.props.children).toBeTruthy();
      expect(activeButton.props.href).toBe(`/${name}`);
      expect(activeButton.props.onPress).toBe(onPress);
      expect(activeButton.props.onLongPress).toBe(onLongPress);
      expect(activeButton.props.role).toBe('tab');
      expect(activeButton.props['aria-label']).toBe(options.tabBarLabel);
      expect(activeButton.props['aria-selected']).toBe(true);
      expect(activeButton.props.android_ripple).toEqual({ borderless: true });

      const inactiveButton = tabBarButton({
        'aria-label': options.tabBarLabel,
        'aria-selected': false,
        children: React.createElement('Text', null, options.tabBarLabel),
        testID: `tab-${name}-inactive`,
        style: { backgroundColor: 'transparent', borderRadius: 0 },
      });
      const inactiveStyle = StyleSheet.flatten(inactiveButton.props.style) as
        | Record<string, unknown>
        | undefined;

      expect(inactiveStyle).toMatchObject({
        backgroundColor: 'transparent',
        borderRadius: radii.pill,
      });
      expect(inactiveStyle).not.toHaveProperty('overflow');
    }

    expect(tabsState.screens.map(({ name }) => name)).toEqual(['index', 'progress', 'profile']);
    expect(tabsState.screens.map(({ options }) => options.tabBarActiveBackgroundColor)).toEqual([
      undefined,
      undefined,
      undefined,
    ]);
    tabsRender.unmount();
  });

  it('mantém labels e ícones distintos para Hoje, Progresso e Perfil', () => {
    render(<TabsLayout />);

    expect(
      tabsState.screens.map(({ options }) => ({
        label: options.tabBarLabel,
        title: options.title,
      })),
    ).toEqual([
      { label: 'Hoje', title: 'Hoje' },
      { label: 'Progresso', title: 'Progresso' },
      { label: 'Perfil', title: 'Perfil' },
    ]);

    const iconNames = tabsState.screens.map(({ options }) => {
      const tabBarIcon = options.tabBarIcon;
      if (!tabBarIcon) {
        throw new Error('Ícone de aba não configurado');
      }

      return tabBarIcon({ color: '#111111', focused: false, size: 24 }).props.name;
    });

    expect(iconNames).toEqual(['calendar-outline', 'stats-chart-outline', 'person-outline']);
  });
});
