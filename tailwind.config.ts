import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        ocs: {
          bg:        '#0a0c0f',
          surface:   '#111318',
          surface2:  '#181c23',
          border:    'rgba(255,255,255,0.07)',
          border2:   'rgba(255,255,255,0.12)',
          text:      '#f0f2f5',
          muted:     '#6b7280',
          green:     '#22c55e',
          'green-dim':'rgba(34,197,94,0.12)',
          blue:      '#3b82f6',
          amber:     '#f59e0b',
        },
      },
      fontFamily: {
        mono: ['Space Mono', 'Courier New', 'monospace'],
        sans: ['DM Sans', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        card: '10px',
      },
      animation: {
        'pulse-slow': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [],
}
export default config
