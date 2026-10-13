import { render } from '@testing-library/react-native';
import React, { type ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  colors,
  controlSizes,
  fontFamilies,
  penTokens,
  spacing,
  typography,
} from '../../lib/design-system/tokens';
import { AppTabsLayout } from './app-tabs';

const safeAreaState = vi.hoisted(() => ({
  insets: { top: 0, right: 0, bottom: 0, left: 0 },
}));

type TabIconProps = {
  color: string;
  focused: boolean;
  size: number;
};

type TabScreen = {
  name: string;
  options: {
    tabBarIcon?: (props: TabIconProps) => React.ReactElement<{ name: string }>;
    tabBarLabel?: string;
    title?: string;
  };
};

type TabBarButtonProps = {
  'aria-label'?: string;
  'aria-selected'?: boolean;
  children?: ReactNode;
  href?: string;
  role?: string;
  testID?: string;
};

type ScreenOptions = {
  tabBarActiveBackgroundColor?: string;
  tabBarActiveTintColor?: string;
  tabBarButton?: (props: TabBarButtonProps) => React.ReactElement;
  tabBarBackground?: () => React.ReactElement<{ pointerEvents?: 'none'; style?: unknown }>;
  tabBarInactiveTintColor?: string;
  tabBarItemStyle?: Record<string, unknown>;
  tabBarLabelStyle?: {
    fontFamily: string;
    fontSize: number;
  };
  tabBarStyle?: Record<string, unknown>;
};

const tabsState = vi.hoisted(() => ({
  screenOptions: null as ScreenOptions | null,
  screens: [] as TabScreen[],
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

        if (!tabBarButton) return null;

        return tabBarButton({
          'aria-label': options.tabBarLabel,
          'aria-selected': name === 'students',
          children: React.createElement('Text', null, options.tabBarLabel),
          href: `/${name}`,
          role: 'tab',
          testID: `tab-${name}`,
        });
      },
    },
  );

  return { Tabs };
});

vi.mock('@react-navigation/elements', () => ({
  PlatformPressable: ({ children, ...props }: TabBarButtonProps) =>
    React.createElement('PlatformPressable', props, children),
}));

vi.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => safeAreaState.insets,
}));

vi.mock('@expo/vector-icons', () => ({
  Ionicons: (props: { color: string; name: string; size: number }) =>
    React.createElement('Ionicons', props),
}));

describe('AppTabsLayout', () => {
  beforeEach(() => {
    tabsState.screenOptions = null;
    tabsState.screens.length = 0;
    safeAreaState.insets = { top: 0, right: 0, bottom: 0, left: 0 };
  });

  it('renderiza labels, ícones, destinos e estado acessível das abas', () => {
    const tabsRender = render(
      <AppTabsLayout
        tabs={[
          { icon: 'home-outline', name: 'index', title: 'Início' },
          { icon: 'people-outline', name: 'students', title: 'Alunos' },
          { icon: 'person-outline', name: 'profile', title: 'Perfil' },
        ]}
      />,
    );

    expect(tabsState.screens.map(({ name }) => name)).toEqual(['index', 'students', 'profile']);
    expect(tabsState.screens.map(({ options }) => options.tabBarLabel)).toEqual([
      'Início',
      'Alunos',
      'Perfil',
    ]);

    const iconNames = tabsState.screens.map(({ options }) => {
      const tabBarIcon = options.tabBarIcon;
      if (!tabBarIcon) throw new Error('Ícone de aba não configurado');
      return tabBarIcon({ color: '#111111', focused: false, size: 24 }).props.name;
    });

    expect(iconNames).toEqual(['home-outline', 'people-outline', 'person-outline']);

    for (const name of ['index', 'students', 'profile']) {
      const tab = tabsRender.getByTestId(`tab-${name}`);
      expect(tab.props.href).toBe(`/${name}`);
      expect(tab.props.role).toBe('tab');
      expect(tab.props['aria-selected']).toBe(name === 'students');
    }
  });

  it('aplica os tokens de tipografia aos labels das abas', () => {
    render(<AppTabsLayout tabs={[]} />);

    expect(tabsState.screenOptions?.tabBarLabelStyle).toEqual({
      fontFamily: fontFamilies.semibold,
      fontSize: typography.caption.fontSize,
    });
  });

  it.each([0, 24, 34])(
    'inseta horizontalmente a seleção sem reduzir o alvo abaixo de 48 dp com inset inferior de %i dp',
    (bottomInset) => {
      safeAreaState.insets.bottom = bottomInset;
      render(<AppTabsLayout tabs={[]} />);

      expect(tabsState.screenOptions?.tabBarItemStyle).toEqual(
        expect.objectContaining({
          marginHorizontal: spacing.optical,
          minHeight: controlSizes.touch,
        }),
      );

      // Pen usa ~106/119 dp; 6 dp por lado preserva a proporção sem fixar a largura do item.
      // A captura Android tem viewport de 320 dp: sobra um slot de 96 dp após os gutters de 16 dp.
      const androidSlotWidth = (320 - 2 * spacing.lg) / 3;
      const androidTouchTargetWidth = androidSlotWidth - 2 * spacing.optical;

      expect(androidTouchTargetWidth).toBeGreaterThanOrEqual(48);
      expect(controlSizes.touch).toBeGreaterThanOrEqual(48);
    },
  );

  it('aplica seleção v2, alvo mínimo e safe area inferior dinâmica à tab bar', () => {
    safeAreaState.insets.bottom = 34;

    render(<AppTabsLayout tabs={[]} />);

    expect(tabsState.screenOptions).toEqual(
      expect.objectContaining({
        tabBarActiveBackgroundColor: colors.subtle,
        tabBarActiveTintColor: colors.brand,
        tabBarInactiveTintColor: colors.inactiveIcon,
        tabBarItemStyle: {
          marginHorizontal: spacing.optical,
          borderRadius: penTokens['radius/29'],
          minHeight: controlSizes.touch,
        },
        tabBarStyle: expect.objectContaining({
          backgroundColor: 'transparent',
          borderRadius: penTokens['radius/33'],
          elevation: 0,
          height: controlSizes.tabBar + 34,
          paddingBottom: spacing.sm + 34,
          paddingTop: spacing.sm,
          shadowOpacity: 0,
          transform: [{ translateY: -spacing.lg }],
        }),
      }),
    );
  });

  it.each([0, 24, 34])(
    'mantém a cápsula de 67dp alinhada ao topo com inset inferior de %i dp',
    (bottomInset) => {
      safeAreaState.insets.bottom = bottomInset;

      render(<AppTabsLayout tabs={[]} />);

      const screenOptions = tabsState.screenOptions;
      if (!screenOptions) throw new Error('As opções das abas não foram capturadas');

      const tabBarBackground = screenOptions.tabBarBackground;
      expect(tabBarBackground).toBeTypeOf('function');
      if (!tabBarBackground) throw new Error('O fundo da tab bar não foi configurado');

      const background = tabBarBackground();
      expect(background.props.pointerEvents).toBe('none');
      expect(background.props.style).toEqual({
        backgroundColor: colors.surface,
        borderRadius: penTokens['radius/34'],
        height: controlSizes.tabBar,
        left: 0,
        position: 'absolute',
        right: 0,
        top: 0,
      });

      expect(screenOptions.tabBarStyle).toEqual(
        expect.objectContaining({
          backgroundColor: 'transparent',
          elevation: 0,
          height: controlSizes.tabBar + bottomInset,
          paddingBottom: spacing.sm + bottomInset,
          paddingTop: spacing.sm,
          shadowOpacity: 0,
          transform: [{ translateY: -spacing.lg }],
        }),
      );
    },
  );
});
