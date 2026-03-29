/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './components/**/*.{js,vue}',
    './layouts/**/*.vue',
    './pages/**/*.vue',
    './composables/**/*.js',
    './app.vue',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          800: '#1a1a2e',
          900: '#0f0f23',
          950: '#0a0a1a',
        },
        categoria: {
          alimentacion: '#ef4444',
          transporte: '#3b82f6',
          vivienda: '#f59e0b',
          salud: '#10b981',
          educacion: '#8b5cf6',
          entretenimiento: '#ec4899',
          vestimenta: '#f97316',
          servicios: '#06b6d4',
          ahorro: '#22c55e',
          deudas: '#e11d48',
          otros: '#6b7280',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      spacing: {
        'safe-bottom': 'env(safe-area-inset-bottom, 0px)',
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
}
