// Adaptado de React Native Reusables; proveniência e licença em README.md e LICENSE.
import { createContext, forwardRef, useContext } from 'react';
import { Text as NativeText, type TextProps as NativeTextProps } from 'react-native';
import { cn } from '../../../lib/design-system/cn';

export const TextClassContext = createContext<string | undefined>(undefined);

const variants = {
  display: 'font-v2-bold text-[84px] leading-[92.4px]',
  timer: 'font-v2-bold text-[43px] leading-[51.6px]',
  screenTitle: 'font-v2-extrabold text-[30px] leading-[36px]',
  sectionTitle: 'font-v2-bold text-[20px] leading-[26px]',
  action: 'font-v2-bold text-[17px] leading-[22.1px]',
  body: 'font-v2-regular text-[14px] leading-[19.6px]',
  support: 'font-v2-regular text-[12px] leading-[16.8px]',
  caption: 'font-v2-bold text-[11px] leading-[15.4px]',
  button: 'font-v2-bold text-[15px] leading-[21px]',
  label: 'font-v2-bold text-[14px] leading-[19.6px]',
} as const;

export type TextProps = NativeTextProps & { variant?: keyof typeof variants; className?: string };

export const Text = forwardRef<NativeText, TextProps>(function Text(
  { variant = 'body', className, ...props },
  ref,
) {
  const inherited = useContext(TextClassContext);
  return (
    <NativeText
      ref={ref}
      className={cn('text-v2-text', variants[variant], inherited, className)}
      {...props}
    />
  );
});
