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
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1e3a5f',
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
