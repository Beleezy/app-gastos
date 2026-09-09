import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  test: {
    environment: 'node',
    globals: false,
    setupFiles: ['./tests/setup-globals.js'],
    include: ['tests/**/*.test.js', 'tests/**/*.spec.js'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      // `shared/compartido/**` es la regla canónica de visibilidad entre
      // cuentas —la que decide qué gastos de un usuario ve otro— y estaba
      // fuera de esta lista pese a tener su propia tabla de verdad en
      // tests/compartidoVisibilidad.test.js: el informe de cobertura no
      // mencionaba el módulo más sensible del proyecto.
      //
      // `server/services/**` es donde vive la lógica de negocio desde que
      // los handlers se adelgazaron; medir solo utils daba una cobertura
      // optimista de código que ya no es el que decide nada.
      include: [
        'server/utils/**',
        'server/services/**',
        'shared/schemas/**',
        'shared/compartido/**',
        'composables/**',
      ],
      exclude: ['**/node_modules/**', '**/.nuxt/**', '**/.output/**'],
    },
  },
  resolve: {
    alias: {
      '~': fileURLToPath(new URL('./', import.meta.url)),
      '@': fileURLToPath(new URL('./', import.meta.url)),
    },
  },
})
