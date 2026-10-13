import type { Config } from 'tailwindcss';
import { colors, fontFamilies, radii } from './src/lib/design-system/tokens';

export default {
  content: {
    relative: true,
    files: ['./app/**/*.{ts,tsx}', './src/**/*.{ts,tsx}', './test/foundation/**/*.{ts,tsx}'],
  },
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: Object.fromEntries(
        Object.entries(colors).map(([name, value]) => [`v2-${name}`, value]),
      ),
      fontFamily: Object.fromEntries(
        Object.entries(fontFamilies).map(([name, value]) => [`v2-${name}`, [value]]),
      ),
      borderRadius: Object.fromEntries(
        Object.entries(radii).map(([name, value]) => [`v2-${name}`, `${value}px`]),
      ),
    },
  },
  plugins: [],
} satisfies Config;
