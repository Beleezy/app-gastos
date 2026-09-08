import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ref, computed, watch, nextTick } from 'vue'

globalThis.ref = ref
globalThis.computed = computed
globalThis.watch = watch
globalThis.useState = (key, init) => ref(typeof init === 'function' ? init() : init)
globalThis.onScopeDispose = () => {}

const store = new Map()
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, v),
  removeItem: (k) => store.delete(k),
  clear: () => store.clear(),
}
globalThis.window = { addEventListener: vi.fn() }

let runtimeConfigStub = { public: { featureFlags: {} } }
globalThis.useRuntimeConfig = () => runtimeConfigStub

let usuarioStoreStub = { configuracion: null }
globalThis.useUsuarioStore = () => usuarioStoreStub

import { useFeatureFlag } from '../composables/useFeatureFlag.js'

describe('useFeatureFlag', () => {
  beforeEach(() => {
    store.clear()
    runtimeConfigStub = { public: { featureFlags: {} } }
    usuarioStoreStub = { configuracion: null }
  })

  it('default cuando no hay nada configurado', () => {
    const { isEnabled } = useFeatureFlag()
    expect(isEnabled('nueva_feature', false)).toBe(false)
    expect(isEnabled('nueva_feature', true)).toBe(true)
  })

  it('runtimeConfig.public.featureFlags se respeta', () => {
    runtimeConfigStub = { public: { featureFlags: { stream_llm: true } } }
    const { isEnabled } = useFeatureFlag()
    expect(isEnabled('stream_llm', false)).toBe(true)
  })

  it('configuracion del usuario tiene mayor prioridad que runtime', () => {
    runtimeConfigStub = { public: { featureFlags: { stream_llm: true } } }
    usuarioStoreStub = { configuracion: { flags: { stream_llm: false } } }
    const { isEnabled } = useFeatureFlag()
    expect(isEnabled('stream_llm', false)).toBe(false)
  })

  it('override en localStorage gana sobre todo lo demás', () => {
    runtimeConfigStub = { public: { featureFlags: { stream_llm: false } } }
    usuarioStoreStub = { configuracion: { flags: { stream_llm: false } } }
    const ff = useFeatureFlag()
    ff.setOverride('stream_llm', true)
    expect(ff.isEnabled('stream_llm', false)).toBe(true)
    ff.setOverride('stream_llm', null)
    expect(ff.isEnabled('stream_llm', false)).toBe(false)
  })

  it('flag() devuelve un ComputedRef reactivo', () => {
    const ff = useFeatureFlag()
    const f = ff.flag('mi_feat', true)
    expect(f.value).toBe(true)
    ff.setOverride('mi_feat', false)
    expect(f.value).toBe(false)
  })

  // Los overrides eran editables desde el panel "Funciones experimentales"
  // de /configuraciones; ese panel se retiró, así que la persistencia (que
  // antes cubría un E2E navegando la página) se verifica aquí.
  it('setOverride persiste en localStorage bajo gastos.featureFlags.v1', async () => {
    const ff = useFeatureFlag()
    ff.setOverride('predictor_categoria', true)
    await nextTick()

    expect(JSON.parse(store.get('gastos.featureFlags.v1'))).toEqual({
      predictor_categoria: true,
    })
  })

  it('una instancia nueva relee los overrides del storage (equivale a recargar)', () => {
    store.set('gastos.featureFlags.v1', JSON.stringify({ predictor_categoria: true }))

    const ff = useFeatureFlag()
    expect(ff.overrides.value).toEqual({ predictor_categoria: true })
    expect(ff.isEnabled('predictor_categoria', false)).toBe(true)
  })

  it('clearOverrides limpia todo', () => {
    const ff = useFeatureFlag()
    ff.setOverride('a', true)
    ff.setOverride('b', true)
    ff.clearOverrides()
    expect(ff.isEnabled('a', false)).toBe(false)
    expect(ff.isEnabled('b', false)).toBe(false)
  })
})
