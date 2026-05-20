/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#0A0A0F',
        surface: '#111118',
        border: '#1E1E2E',
        accent: '#7C6FFF',
        danger: '#FF4A6E',
        success: '#00E5A0',
        warning: '#FFB547',
        'text-primary': '#F0EEF8',
        'text-muted': '#6E6C85',
      },
      fontFamily: {
        display: ['Syne', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
        body: ['DM Sans', 'sans-serif'],
        sans: ['DM Sans', 'sans-serif'],
      },
      borderColor: {
        DEFAULT: '#1E1E2E',
      },
    },
  },
  plugins: [],
}
