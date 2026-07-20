// ESLint flat config (v9). Ver §4.3 de planifica.md.
// `.nuxt/eslint.config.mjs` lo genera el módulo @nuxt/eslint en `nuxt
// prepare` (postinstall): trae los globals de auto-imports del proyecto
// (h3/nitro, composables propios, Vue), sin los cuales no-undef produce
// cientos de falsos positivos. El lint es bloqueante en CI.
import withNuxt from './.nuxt/eslint.config.mjs'

export default withNuxt({
  ignores: [
    '.nuxt/',
    '.output/',
    'dist/',
    'node_modules/',
    'server/database/migrations/',
    'types/database.types.ts', // generado por Supabase
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
    // Variante TS-aware que activa el preset de Nuxt: misma política
    // incremental (warn + prefijo _) que no-unused-vars; caughtErrors
    // exentos porque `catch (e)` sin uso es guard válido aquí.
    '@typescript-eslint/no-unused-vars': [
      'warn',
      { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrors: 'none' },
    ],
    eqeqeq: ['warn', 'smart'],
    // `catch {}` como guard deliberado (localStorage, JSON.parse, APIs de
    // browser opcionales) es patrón extendido en esta base.
    'no-empty': ['error', { allowEmptyCatch: true }],
  },
}).append({
  // En tests, el patrón vi.mock + import posterior es intencional
  // (vi.mock se hoistea; el orden visual documenta la dependencia).
  files: ['tests/**'],
  rules: {
    'import/first': 'off',
  },
})
