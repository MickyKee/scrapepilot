import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{js,ts,jsx,tsx}', './components/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        display: ['var(--font-display)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'monospace'],
      },
      colors: {
        surface: 'oklch(var(--surface) / <alpha-value>)',
        panel: 'oklch(var(--panel) / <alpha-value>)',
        border: 'oklch(var(--border) / <alpha-value>)',
        text: 'oklch(var(--text) / <alpha-value>)',
        muted: 'oklch(var(--muted) / <alpha-value>)',
        accent: 'oklch(var(--accent) / <alpha-value>)',
        accent2: 'oklch(var(--accent2) / <alpha-value>)',
        success: 'oklch(var(--success) / <alpha-value>)',
        danger: 'oklch(var(--danger) / <alpha-value>)',
        warning: 'oklch(var(--warning) / <alpha-value>)',
      },
      boxShadow: {
        panel: '0 8px 32px -12px oklch(0.04 0.01 220 / 0.8), inset 0 1px 0 oklch(0.30 0.02 220 / 0.15)',
        glow: '0 0 0 1px oklch(0.78 0.16 195 / 0.2), 0 0 24px -4px oklch(0.78 0.16 195 / 0.25), 0 8px 32px -8px oklch(0.78 0.16 195 / 0.15)',
        'glow-sm': '0 0 0 1px oklch(0.78 0.16 195 / 0.15), 0 0 12px -2px oklch(0.78 0.16 195 / 0.2)',
        neon: '0 0 4px oklch(0.78 0.16 195 / 0.4), 0 0 16px oklch(0.78 0.16 195 / 0.15)',
        'neon-green': '0 0 4px oklch(0.80 0.19 150 / 0.4), 0 0 16px oklch(0.80 0.19 150 / 0.15)',
        'neon-danger': '0 0 4px oklch(0.68 0.24 20 / 0.4), 0 0 16px oklch(0.68 0.24 20 / 0.15)',
        inner: 'inset 0 2px 8px oklch(0.04 0.01 220 / 0.5)',
      },
      animation: {
        rise: 'rise 0.6s cubic-bezier(0.16, 1, 0.3, 1) both',
        pulseSoft: 'pulseSoft 2.4s ease-in-out infinite',
        shimmer: 'shimmer 1.8s linear infinite',
        'glow-pulse': 'glowPulse 3s ease-in-out infinite',
        scan: 'scan 4s linear infinite',
        flicker: 'flicker 0.15s ease-in-out',
        'cursor-blink': 'cursorBlink 1.1s step-end infinite',
      },
      keyframes: {
        rise: {
          '0%': { opacity: '0', transform: 'translateY(18px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        glowPulse: {
          '0%, 100%': { boxShadow: '0 0 4px oklch(0.78 0.16 195 / 0.3), 0 0 12px oklch(0.78 0.16 195 / 0.1)' },
          '50%': { boxShadow: '0 0 8px oklch(0.78 0.16 195 / 0.5), 0 0 24px oklch(0.78 0.16 195 / 0.2)' },
        },
        scan: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100%)' },
        },
        flicker: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.8' },
        },
        cursorBlink: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
