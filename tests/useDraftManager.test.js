import { describe, it, expect, vi } from 'vitest'
import { ref } from 'vue'
import { useDraftManager } from '../composables/useDraftManager.js'

// Stub Vue's `ref` global since composables se invocan fuera de setup()
globalThis.ref = ref

describe('useDraftManager', () => {
  it('exige un parser', () => {
    expect(() => useDraftManager()).toThrow()
  })

  it('parsea correctamente y popula parsedItems', async () => {
    const parser = vi.fn(async () => ({ gastos: [{ concepto: 'A', monto: 1 }] }))
    const m = useDraftManager({ parser })
    await m.start('hola')
    expect(parser).toHaveBeenCalledOnce()
    expect(m.isParsing.value).toBe(false)
    expect(m.parsedItems.value).toHaveLength(1)
    expect(m.parseError.value).toBeNull()
  })

  it('captura errores en parseError', async () => {
    const parser = vi.fn(async () => {
      throw new Error('boom')
    })
    const m = useDraftManager({ parser })
    await m.start('algo')
    expect(m.parseError.value).toBe('boom')
    expect(m.parsedItems.value).toEqual([])
  })

  it('retry reusa el último input', async () => {
    const parser = vi.fn(async () => ({ gastos: [{ id: 1 }] }))
    const m = useDraftManager({ parser })
    await m.start('input1')
    await m.retry()
    expect(parser).toHaveBeenCalledTimes(2)
    expect(parser.mock.calls[1][0]).toBe('input1')
  })

  it('discard limpia estado pero conserva lastInput', () => {
    const parser = vi.fn(async () => ({ gastos: [] }))
    const m = useDraftManager({ parser })
    m.lastInput.value = 'x'
    m.parsedItems.value = [{}]
    m.discard()
    expect(m.parsedItems.value).toEqual([])
    expect(m.hasDraft.value).toBe(false)
  })

  it('onResultMap personalizado', async () => {
    const parser = vi.fn(async () => ({ items: [1, 2, 3] }))
    const m = useDraftManager({ parser, onResultMap: (d) => d.items })
    await m.start('x')
    expect(m.parsedItems.value).toEqual([1, 2, 3])
  })
})
