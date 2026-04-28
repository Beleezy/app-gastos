// Stubs mínimos de globales de Nitro/H3 para que módulos de server/utils
// se puedan cargar en tests unitarios sin levantar Nuxt.

import { vi } from 'vitest'

if (!globalThis.createError) {
  globalThis.createError = (opts) => {
    const err = new Error(opts?.message || 'Error')
    Object.assign(err, opts)
    return err
  }
}

if (!globalThis.setResponseHeader) {
  globalThis.setResponseHeader = vi.fn()
}

if (!globalThis.getRequestHeader) {
  globalThis.getRequestHeader = vi.fn(() => null)
}

if (!globalThis.setResponseStatus) {
  globalThis.setResponseStatus = vi.fn()
}
