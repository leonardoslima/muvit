import type { Config } from 'tailwindcss';
import { v2Colors, v2FontFamilies, v2Radii } from './src/lib/design-system/tokens';

export default {
  content: {
    relative: true,
    files: ['./app/**/*.{ts,tsx}', './src/**/*.{ts,tsx}', './test/foundation/**/*.{ts,tsx}'],
  },
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: Object.fromEntries(
        Object.entries(v2Colors).map(([name, value]) => [`v2-${name}`, value]),
      ),
      fontFamily: Object.fromEntries(
        Object.entries(v2FontFamilies).map(([name, value]) => [`v2-${name}`, [value]]),
      ),
      borderRadius: Object.fromEntries(
        Object.entries(v2Radii).map(([name, value]) => [`v2-${name}`, `${value}px`]),
      ),
    },
  },
  plugins: [],
} satisfies Config;
