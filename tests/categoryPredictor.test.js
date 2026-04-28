import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ref, computed, watch, unref } from 'vue'

// Stubs Vue + Nuxt
globalThis.ref = ref
globalThis.computed = computed
globalThis.watch = watch
globalThis.unref = unref
globalThis.useState = (key, init) => {
  const r = ref(typeof init === 'function' ? init() : init)
  return r
}
globalThis.onScopeDispose = () => {}

// localStorage stub
const store = new Map()
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, v),
  removeItem: (k) => store.delete(k),
  clear: () => store.clear(),
}
globalThis.window = {
  addEventListener: vi.fn(),
}

import { useCategoryPredictor } from '../composables/useCategoryPredictor.js'

describe('useCategoryPredictor', () => {
  beforeEach(() => {
    store.clear()
  })

  it('aprende y predice la categoría más usada', () => {
    const p = useCategoryPredictor()
    p.aprender('Pan en panadería', 'cat-comida')
    p.aprender('Pan integral', 'cat-comida')
    p.aprender('Pan en supermercado', 'cat-otros')

    const r = p.predecir('Pan')
    expect(r).not.toBeNull()
    expect(r.categoriaId).toBe('cat-comida')
    expect(r.confianza).toBeCloseTo(2 / 3, 2)
    expect(r.observaciones).toBe(3)
  })

  it('null si no hay observaciones', () => {
    const p = useCategoryPredictor()
    expect(p.predecir('algo nuevo')).toBeNull()
  })

  it('match por prefijo', () => {
    const p = useCategoryPredictor()
    p.aprender('café americano', 'cat-cafe')
    expect(p.predecir('café')).not.toBeNull()
    expect(p.predecir('cafe ame')).not.toBeNull() // sin acento
  })

  it('reset limpia memoria', () => {
    const p = useCategoryPredictor()
    p.aprender('cosa', 'cat-x')
    p.reset()
    expect(p.predecir('cosa')).toBeNull()
  })

  it('aprender ignora entradas inválidas', () => {
    const p = useCategoryPredictor()
    p.aprender('', 'cat-x')
    p.aprender('algo', null)
    expect(p.predecir('algo')).toBeNull()
  })
})
