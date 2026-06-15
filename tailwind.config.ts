import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'tfr-cyan':   '#00D4FF',
        'tfr-lime':   '#A4FF00',
        'tfr-dark':   '#0A0C10',
        'tfr-card':   '#0F1318',
        'tfr-card2':  '#141B24',
        'tfr-border': '#1E2D3D',
        'tfr-muted':  '#4A6070',
        'status-up':      '#A4FF00',
        'status-down':    '#FF4444',
        'status-unknown': '#F59E0B',
        'status-idle':    '#4A6070',
      },
      fontFamily: {
        display: ['Delcom', 'system-ui', 'sans-serif'],
        body:    ['DM Sans', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 3px rgba(0,0,0,0.5), 0 0 0 1px rgba(30,45,61,0.8)',
        'card-cyan': '0 0 0 1px rgba(0,212,255,0.3)',
      },
    },
  },
  plugins: [],
} satisfies Config
