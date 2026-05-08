import type { Config } from 'tailwindcss';

export default {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        card: {
          DEFAULT: 'var(--card)',
          hover: 'var(--card-hover)',
          foreground: 'var(--card-foreground)',
        },
        popover: {
          DEFAULT: 'var(--popover)',
          foreground: 'var(--popover-foreground)',
        },
        primary: {
          DEFAULT: 'var(--primary)',
          hover: 'var(--primary-hover)',
          foreground: 'var(--primary-foreground)',
        },
        secondary: {
          DEFAULT: 'var(--secondary)',
          foreground: 'var(--secondary-foreground)',
        },
        muted: {
          DEFAULT: 'var(--muted)',
          foreground: 'var(--muted-foreground)',
        },
        accent: {
          DEFAULT: 'var(--accent)',
          foreground: 'var(--accent-foreground)',
        },
        destructive: {
          DEFAULT: 'var(--destructive)',
          bg: 'var(--destructive-bg)',
          foreground: 'var(--destructive-foreground)',
        },
        warning: {
          DEFAULT: 'var(--warning)',
          bg: 'var(--warning-bg)',
        },
        info: {
          DEFAULT: 'var(--info)',
          bg: 'var(--info-bg)',
        },
        success: {
          DEFAULT: 'var(--success)',
          bg: 'var(--success-bg)',
        },
        inactive: {
          DEFAULT: 'var(--inactive)',
          bg: 'var(--inactive-bg)',
        },
        border: 'var(--border)',
        'border-dark': 'var(--border-dark)',
        input: 'var(--input)',
        ring: 'var(--ring)',
        sidebar: {
          DEFAULT: 'var(--sidebar)',
          foreground: 'var(--sidebar-foreground)',
          primary: 'var(--sidebar-primary)',
          'primary-foreground': 'var(--sidebar-primary-foreground)',
          accent: 'var(--sidebar-accent)',
          'accent-foreground': 'var(--sidebar-accent-foreground)',
          muted: 'var(--sidebar-muted)',
          border: 'var(--sidebar-border)',
          ring: 'var(--sidebar-ring)',
        },
        mkt: {
          dark: 'var(--mkt-section-dark)',
          'dark-elevated': 'var(--mkt-section-dark-elevated)',
          light: 'var(--mkt-section-light)',
          'on-dark': 'var(--mkt-text-on-dark)',
          'on-dark-muted': 'var(--mkt-text-on-dark-muted)',
          'card-border': 'var(--mkt-card-border)',
          cta: 'var(--mkt-cta)',
          'cta-hover': 'var(--mkt-cta-hover)',
          'cta-active': 'var(--mkt-cta-active)',
          'cta-foreground': 'var(--mkt-cta-foreground)',
        },
      },
      borderRadius: {
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
        pill: 'var(--radius-pill)',
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'Inter', 'system-ui', 'sans-serif'],
        display: ['var(--font-space-grotesk)', '"Space Grotesk"', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        'hero-display': ['72px', { lineHeight: '1.05', letterSpacing: '-0.02em', fontWeight: '700' }],
        'hero-display-mobile': ['44px', { lineHeight: '1.1', letterSpacing: '-0.02em', fontWeight: '700' }],
        'hero-h2': ['48px', { lineHeight: '1.15', letterSpacing: '-0.01em', fontWeight: '700' }],
        'hero-h3': ['32px', { lineHeight: '1.2', fontWeight: '700' }],
        'hero-lead': ['20px', { lineHeight: '1.5' }],
      },
      boxShadow: {
        subtle: 'var(--shadow-subtle)',
        card: 'var(--shadow-card)',
        elevated: 'var(--shadow-elevated)',
      },
      backgroundImage: {
        'mkt-hero': 'linear-gradient(200deg, var(--mkt-hero-from) 0%, var(--mkt-hero-to) 100%)',
      },
      maxWidth: {
        container: '1280px',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
} satisfies Config;
