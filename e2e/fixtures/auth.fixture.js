// Fixture de autenticacion: el bypass via x-dev-auth-token ya viaja en
// extraHTTPHeaders desde playwright.config.js. Este fixture solo expone
// helpers para verificar que el bypass esta activo y para simular un
// usuario alternativo si fuera necesario.

import { test as base, expect } from '@playwright/test'

export const E2E_USER_ID =
  process.env.E2E_USER_ID || '00000000-0000-0000-0000-000000000101'
export const E2E_USER_EMAIL =
  process.env.E2E_USER_EMAIL || 'demo1@test.local'

export const test = base.extend({
  authHeaders: async ({}, use) => {
    if (process.env.DEV_AUTH_BYPASS !== '1') {
      throw new Error(
        'DEV_AUTH_BYPASS=1 es requerido para tests UI E2E. ' +
        'Revisa playwright.config.js y la variable de entorno.'
      )
    }
    await use({
      'x-dev-auth-token': process.env.DEV_AUTH_TOKEN || 'dev-token',
      'x-dev-user-id': E2E_USER_ID,
      'x-dev-user-email': E2E_USER_EMAIL,
    })
  },
})

export { expect }
