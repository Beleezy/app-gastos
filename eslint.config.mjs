// ESLint flat config (v9). Ver §4.3 de planifica.md.
// Incremental: empezamos suave para no romper el repo y endurecemos
// con el tiempo. Reglas que ya pueden valer fallar: errores de sintaxis,
// variables no usadas en código nuevo, comparaciones débiles inseguras.
import { createConfigForNuxt } from '@nuxt/eslint-config/flat'

export default createConfigForNuxt({
  features: {
    stylistic: false,
  },
}).append({
  ignores: [
    '.nuxt/',
    '.output/',
    'dist/',
    'node_modules/',
    'server/database/migrations/',
    '*.min.js',
    'public/sw.js',
    'public/registerSW.js',
  ],
  rules: {
    'no-console': 'off',
    'vue/multi-word-component-names': 'off',
    'vue/html-self-closing': 'off',
    'vue/max-attributes-per-line': 'off',
    'vue/singleline-html-element-content-newline': 'off',
    'vue/html-indent': 'off',
    'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    eqeqeq: ['warn', 'smart'],
  },
})
