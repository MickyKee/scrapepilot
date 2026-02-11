import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{js,ts,jsx,tsx}', './components/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        surface: 'oklch(var(--surface) / <alpha-value>)',
        panel: 'oklch(var(--panel) / <alpha-value>)',
        border: 'oklch(var(--border) / <alpha-value>)',
        text: 'oklch(var(--text) / <alpha-value>)',
        muted: 'oklch(var(--muted) / <alpha-value>)',
        accent: 'oklch(var(--accent) / <alpha-value>)',
        success: 'oklch(var(--success) / <alpha-value>)',
        danger: 'oklch(var(--danger) / <alpha-value>)'
      },
      boxShadow: {
        panel: '0 10px 34px -18px oklch(0.08 0.02 255 / 0.9)',
        glow: '0 0 0 1px oklch(0.72 0.19 250 / 0.3), 0 10px 40px -16px oklch(0.72 0.19 250 / 0.45)'
      },
      animation: {
        rise: 'rise 0.55s cubic-bezier(0.2, 1, 0.22, 1) both',
        pulseSoft: 'pulseSoft 2.4s ease-in-out infinite',
        shimmer: 'shimmer 1.6s linear infinite'
      },
      keyframes: {
        rise: {
          '0%': { opacity: '0', transform: 'translateY(14px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.6' }
        },
        shimmer: {
          '0%': { backgroundPosition: '-180% 0' },
          '100%': { backgroundPosition: '180% 0' }
        }
      }
    }
  },
  plugins: [],
};

export default config;
