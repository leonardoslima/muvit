import type { PlatformPressable } from '@react-navigation/elements';
import { render } from '@testing-library/react-native';
import React, { type ReactNode } from 'react';
import { StyleSheet } from 'react-native';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import TabsLayout from '../../app/(tabs)/_layout';
import { colors, radii, spacing } from '../lib/styles';

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

type TabBarButtonProps = React.ComponentProps<typeof PlatformPressable>;

type ScreenOptions = {
  tabBarActiveBackgroundColor?: string;
  tabBarAllowFontScaling?: boolean;
  tabBarButton?: (props: TabBarButtonProps) => React.ReactElement;
  tabBarItemStyle?: unknown;
  tabBarStyle?: unknown;
};

type RenderedButtonCase = {
  expectedBackground: string;
  label: string | undefined;
  labelTestID: string;
  name: string;
  onLongPress: () => void;
  onPress: () => void;
  selected: boolean;
  testID: string;
};

const tabsState = vi.hoisted(() => ({
  buttonCases: [] as RenderedButtonCase[],
  screenOptions: null as ScreenOptions | null,
  screens: [] as TabScreen[],
}));

const platformPressableState = vi.hoisted(() => ({
  calls: 0,
}));

vi.mock('expo-router', () => {
  const Tabs = Object.assign(
    ({ children, screenOptions }: { children: ReactNode; screenOptions: ScreenOptions }) => {
      tabsState.screenOptions = screenOptions;
      return React.createElement('View', null, children);
    },
    {
      Screen: ({ name, options }: TabScreen) => {
        tabsState.screens.push({ name, options });

        const tabBarButton = tabsState.screenOptions?.tabBarButton;
        if (!tabBarButton) {
          return null;
        }

        const buttons = [true, false].map((selected) => {
          const testID = `tab-${name}-${selected ? 'active' : 'inactive'}`;
          const labelTestID = `${testID}-label`;
          const onPress = vi.fn();
          const onLongPress = vi.fn();
          const element = tabBarButton({
            'aria-label': options.tabBarLabel,
            'aria-selected': selected,
            android_ripple: { borderless: true },
            children: React.createElement('Text', { testID: labelTestID }, options.tabBarLabel),
            href: `/${name}`,
            onLongPress,
            onPress,
            role: 'tab',
            style: {
              backgroundColor: selected ? colors.primarySoft : 'transparent',
              borderRadius: 0,
            },
            testID,
          });

          tabsState.buttonCases.push({
            expectedBackground: selected ? colors.primarySoft : 'transparent',
            label: options.tabBarLabel,
            labelTestID,
            name,
            onLongPress,
            onPress,
            selected,
            testID,
          });

          return { element, testID };
        });

        return React.createElement(
          React.Fragment,
          null,
          buttons.map(({ element, testID }) =>
            React.createElement(React.Fragment, { key: testID }, element),
          ),
        );
      },
    },
  );

  return { Tabs };
});

vi.mock('@react-navigation/elements', () => ({
  PlatformPressable: React.forwardRef<unknown, TabBarButtonProps>(({ children, ...props }, ref) => {
    platformPressableState.calls += 1;
    return React.createElement('PlatformPressable', { ...props, ref }, children);
  }),
}));

vi.mock('@expo/vector-icons', () => ({
  Ionicons: (props: { name: string; color: string; size: number }) =>
    React.createElement('Ionicons', props),
}));

describe('TabsLayout', () => {
  beforeEach(() => {
    tabsState.buttonCases.length = 0;
    tabsState.screenOptions = null;
    tabsState.screens.length = 0;
    platformPressableState.calls = 0;
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
      marginHorizontal: spacing.lg,
      transform: [{ translateY: -spacing.lg }],
    });
    expect(screenOptions.tabBarStyle).not.toHaveProperty('marginBottom');
    expect(screenOptions.tabBarStyle).not.toHaveProperty('bottom');
    expect(screenOptions.tabBarStyle).not.toHaveProperty('left');
    expect(screenOptions.tabBarStyle).not.toHaveProperty('right');
    expect(screenOptions.tabBarAllowFontScaling).not.toBe(false);

    expect(tabsState.screens.map(({ name }) => name)).toEqual(['index', 'progress', 'profile']);
    expect(tabsState.screens.map(({ options }) => options.tabBarActiveBackgroundColor)).toEqual([
      undefined,
      undefined,
      undefined,
    ]);
    expect(typeof screenOptions.tabBarButton).toBe('function');
    expect(platformPressableState.calls).toBe(tabsState.buttonCases.length);
    expect(tabsState.buttonCases).toHaveLength(6);

    for (const buttonCase of tabsState.buttonCases) {
      const host = tabsRender.getByTestId(buttonCase.testID);
      const style = StyleSheet.flatten(host.props.style);

      expect(host.type).toBe('PlatformPressable');
      expect(style).toMatchObject({
        backgroundColor: buttonCase.expectedBackground,
        borderRadius: radii.pill,
      });
      expect(style).not.toHaveProperty('overflow');
      expect(host.props.testID).toBe(buttonCase.testID);
      expect(host.props.onPress).toBe(buttonCase.onPress);
      expect(host.props.onLongPress).toBe(buttonCase.onLongPress);
      expect(host.props.role).toBe('tab');
      expect(host.props['aria-label']).toBe(buttonCase.label);
      expect(host.props['aria-selected']).toBe(buttonCase.selected);
      expect(host.props.href).toBe(`/${buttonCase.name}`);
      expect(host.props.android_ripple).toEqual({ borderless: true });
      expect(tabsRender.getByTestId(buttonCase.labelTestID).props.children).toBe(buttonCase.label);
    }
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
