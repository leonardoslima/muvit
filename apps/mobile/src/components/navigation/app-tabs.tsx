import { Ionicons } from '@expo/vector-icons';
import { PlatformPressable } from '@react-navigation/elements';
import { Tabs } from 'expo-router';
import {
  type ComponentProps,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
} from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  colors,
  controlSizes,
  fontFamilies,
  penTokens,
  spacing,
  tabBarLayout,
  typography,
} from '../../lib/design-system/tokens';

export type AppTab = {
  name: string;
  title: string;
  icon: ComponentProps<typeof Ionicons>['name'];
};

export type AppTabsLayoutProps = {
  tabs: readonly AppTab[];
};

export type AppTabPressGuard = {
  busy: boolean;
  dirty: boolean;
  requestLeave: (resumeNavigation: () => void) => void;
};

type AppTabPressGuardContextValue = {
  register: (owner: symbol, guard: AppTabPressGuard | undefined) => void;
};

const AppTabPressGuardContext = createContext<AppTabPressGuardContextValue | undefined>(undefined);

export function useRegisterAppTabPressGuard(guard: AppTabPressGuard, enabled: boolean): void {
  const context = useContext(AppTabPressGuardContext);
  const owner = useRef(Symbol('app-tab-press-guard'));
  const guardRef = useRef(guard);
  guardRef.current = guard;
  const registeredGuard = useMemo<AppTabPressGuard>(
    () => ({
      get busy() {
        return guardRef.current.busy;
      },
      get dirty() {
        return guardRef.current.dirty;
      },
      requestLeave: (resumeNavigation) => guardRef.current.requestLeave(resumeNavigation),
    }),
    [],
  );

  useEffect(() => {
    if (!enabled || !context) return;

    context.register(owner.current, registeredGuard);
    return () => context.register(owner.current, undefined);
  }, [context, enabled, registeredGuard]);
}

export function AppTabsLayout({ tabs }: AppTabsLayoutProps) {
  const insets = useSafeAreaInsets();
  const guardsRef = useRef(new Map<symbol, AppTabPressGuard>());
  const registerGuard = useCallback((owner: symbol, guard: AppTabPressGuard | undefined) => {
    if (guard) {
      guardsRef.current.set(owner, guard);
      return;
    }
    guardsRef.current.delete(owner);
  }, []);
  const guardContextValue = useMemo(() => ({ register: registerGuard }), [registerGuard]);

  return (
    <AppTabPressGuardContext.Provider value={guardContextValue}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.brand,
          tabBarActiveBackgroundColor: colors.subtle,
          tabBarInactiveTintColor: colors.inactiveIcon,
          tabBarItemStyle: {
            marginHorizontal: spacing.optical,
            borderRadius: penTokens['radius/29'],
            minHeight: controlSizes.touch,
          },
          tabBarButton: (props) => (
            <PlatformPressable
              {...props}
              onPress={(event) => {
                if (!props.onPress) return;

                const activeGuard = Array.from(guardsRef.current.values()).at(-1);
                if (!activeGuard || (!activeGuard.busy && !activeGuard.dirty)) {
                  props.onPress(event);
                  return;
                }
                if (activeGuard.busy) return;

                event.persist();
                activeGuard.requestLeave(() => props.onPress?.(event));
              }}
              style={[
                props.style,
                { borderRadius: penTokens['radius/29'], minHeight: controlSizes.touch },
              ]}
            />
          ),
          tabBarLabelStyle: {
            fontFamily: fontFamilies.semibold,
            fontSize: typography.caption.fontSize,
          },
          tabBarBackground: () => (
            <View
              pointerEvents="none"
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: controlSizes.tabBar,
                borderRadius: penTokens['radius/34'],
                backgroundColor: colors.surface,
              }}
            />
          ),
          tabBarStyle: {
            position: 'absolute',
            marginHorizontal: spacing.lg,
            transform: [{ translateY: -tabBarLayout.offset }],
            height: controlSizes.tabBar + insets.bottom,
            borderRadius: penTokens['radius/33'],
            borderTopWidth: 0,
            backgroundColor: 'transparent',
            elevation: 0,
            shadowOpacity: 0,
            paddingBottom: spacing.sm + insets.bottom,
            paddingTop: spacing.sm,
          },
        }}
      >
        {tabs.map((tab) => (
          <Tabs.Screen
            key={tab.name}
            name={tab.name}
            options={{
              title: tab.title,
              tabBarLabel: tab.title,
              tabBarIcon: ({ color, size }) => (
                <Ionicons color={color} name={tab.icon} size={size} />
              ),
            }}
          />
        ))}
      </Tabs>
    </AppTabPressGuardContext.Provider>
  );
}
