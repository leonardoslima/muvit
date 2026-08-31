import { render } from '@testing-library/react-native';
import React, { type ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fontFamilies, typography } from '../../lib/styles';
import { AppTabsLayout } from './app-tabs';

vi.mock('../../lib/styles', async (importOriginal) => {
  const styles = await importOriginal<typeof import('../../lib/styles')>();

  return {
    ...styles,
    typography: {
      ...styles.typography,
      caption: {
        ...styles.typography.caption,
        fontSize: 11,
      },
    },
  };
});

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
  tabBarButton?: (props: TabBarButtonProps) => React.ReactElement;
  tabBarLabelStyle?: {
    fontFamily: string;
    fontSize: number;
  };
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

vi.mock('@expo/vector-icons', () => ({
  Ionicons: (props: { color: string; name: string; size: number }) =>
    React.createElement('Ionicons', props),
}));

describe('AppTabsLayout', () => {
  beforeEach(() => {
    tabsState.screenOptions = null;
    tabsState.screens.length = 0;
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
      fontFamily: fontFamilies.bodyStrong,
      fontSize: typography.caption.fontSize,
    });
  });
});
