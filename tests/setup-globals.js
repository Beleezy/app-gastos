// Stubs mínimos de globales de Nitro/H3 + Vue para que los módulos de
// server/utils y composables se puedan cargar en tests unitarios sin
// levantar Nuxt completo.

import { vi } from 'vitest'
import { ref, computed, watch, reactive, unref, nextTick } from 'vue'
import { handleApiError } from '../utils/handleApiError.js'

// Auto-imports de Nuxt usados por composables
if (!globalThis.ref) globalThis.ref = ref
if (!globalThis.computed) globalThis.computed = computed
if (!globalThis.watch) globalThis.watch = watch
if (!globalThis.reactive) globalThis.reactive = reactive
if (!globalThis.unref) globalThis.unref = unref
if (!globalThis.nextTick) globalThis.nextTick = nextTick
if (!globalThis.useState) {
  globalThis.useState = (key, init) => ref(typeof init === 'function' ? init() : init)
}
// `handleApiError` vive en utils/ y Nuxt lo auto-importa. Se registra la
// función REAL y no un stub: los composables que la usan para poblar su
// `error.value` deben ejercitar el filtro de mensajes técnicos de verdad,
// que es justo lo que se les estaba escapando cuando hacían
// `e?.data?.message || 'fallback'` a mano.
if (!globalThis.handleApiError) globalThis.handleApiError = handleApiError

if (!globalThis.onScopeDispose) globalThis.onScopeDispose = () => {}
if (!globalThis.onMounted) globalThis.onMounted = () => {}
if (!globalThis.onUnmounted) globalThis.onUnmounted = () => {}

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
