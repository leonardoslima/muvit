import { render } from '@testing-library/react-native';
import React, { type ReactNode } from 'react';
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
    render(<TabsLayout />);

    const screenOptions = tabsState.screenOptions;
    if (!screenOptions) {
      throw new Error('As opções das abas não foram capturadas');
    }

    expect(screenOptions.tabBarActiveBackgroundColor).toBe(colors.primarySoft);
    expect(screenOptions.tabBarItemStyle).toEqual({
      borderRadius: radii.pill,
      overflow: 'hidden',
    });
    expect(screenOptions.tabBarStyle).toMatchObject({
      borderRadius: radii.pill,
    });

    expect(tabsState.screens.map(({ name }) => name)).toEqual(['index', 'progress', 'profile']);
    expect(tabsState.screens.map(({ options }) => options.tabBarActiveBackgroundColor)).toEqual([
      undefined,
      undefined,
      undefined,
    ]);
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
