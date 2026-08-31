import { render } from '@testing-library/react-native';
import React, { type ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import TrainerTabsLayout from '../../app/(trainer)/trainer/_layout';

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

const tabsState = vi.hoisted(() => ({
  screens: [] as TabScreen[],
}));

vi.mock('expo-router', () => {
  const Tabs = Object.assign(
    ({ children }: { children: ReactNode }) => React.createElement('Tabs', null, children),
    {
      Screen: ({ name, options }: TabScreen) => {
        tabsState.screens.push({ name, options });
        return null;
      },
    },
  );

  return { Tabs };
});

vi.mock('@react-navigation/elements', () => ({
  PlatformPressable: React.forwardRef<unknown, { children?: ReactNode }>(({ children }, ref) =>
    React.createElement('PlatformPressable', { ref }, children),
  ),
}));

vi.mock('@expo/vector-icons', () => ({
  Ionicons: (props: { name: string; color: string; size: number }) =>
    React.createElement('Ionicons', props),
}));

describe('TrainerTabsLayout', () => {
  beforeEach(() => {
    tabsState.screens.length = 0;
  });

  it('expõe somente as abas públicas do shell trainer', () => {
    render(<TrainerTabsLayout />);

    expect(
      tabsState.screens.map(({ name, options }) => ({
        label: options.tabBarLabel,
        name,
        title: options.title,
      })),
    ).toEqual([
      { label: 'Início', name: 'index', title: 'Início' },
      { label: 'Alunos', name: 'students', title: 'Alunos' },
      { label: 'Perfil', name: 'profile', title: 'Perfil' },
    ]);

    const iconNames = tabsState.screens.map(({ options }) => {
      const tabBarIcon = options.tabBarIcon;
      if (!tabBarIcon) {
        throw new Error('Ícone de aba não configurado');
      }

      return tabBarIcon({ color: '#111111', focused: false, size: 24 }).props.name;
    });

    expect(iconNames).toEqual(['home-outline', 'people-outline', 'person-outline']);
  });
});
