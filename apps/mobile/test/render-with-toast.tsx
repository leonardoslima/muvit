import { render as nativeRender } from '@testing-library/react-native';
import type { PropsWithChildren } from 'react';
import { ToastProvider } from '../src/components/ui/v2/toast';

export function render(
  ui: Parameters<typeof nativeRender>[0],
  options?: Parameters<typeof nativeRender>[1],
): ReturnType<typeof nativeRender> {
  const OriginalWrapper = options?.wrapper;
  function Wrapper({ children }: PropsWithChildren): React.JSX.Element {
    return (
      <ToastProvider>
        {OriginalWrapper ? <OriginalWrapper>{children}</OriginalWrapper> : children}
      </ToastProvider>
    );
  }
  return nativeRender(ui, { ...options, wrapper: Wrapper });
}
