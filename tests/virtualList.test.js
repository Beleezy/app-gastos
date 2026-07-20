import { describe, it, expect } from 'vitest'
import { calcularRango } from '../composables/useVirtualList.js'

describe('calcularRango', () => {
  it('rango inicial sin scroll', () => {
    const r = calcularRango({
      scrollTop: 0,
      itemHeight: 50,
      containerHeight: 500,
      total: 1000,
      overscan: 3,
    })
    expect(r.startIndex).toBe(0)
    expect(r.visibleCount).toBe(10)
    expect(r.endIndex).toBe(16) // 0 + 10 + 3*2
  })

  it('respeta el total', () => {
    const r = calcularRango({
      scrollTop: 0,
      itemHeight: 50,
      containerHeight: 500,
      total: 5,
      overscan: 3,
    })
    expect(r.startIndex).toBe(0)
    expect(r.endIndex).toBe(5)
  })

  it('aplica overscan al inicio sin volverse negativo', () => {
    const r = calcularRango({
      scrollTop: 100,
      itemHeight: 50,
      containerHeight: 500,
      total: 100,
      overscan: 5,
    })
    expect(r.startIndex).toBe(0) // 2 - 5 = -3 → clamp 0
  })

  it('avanza con scroll', () => {
    const r = calcularRango({
      scrollTop: 1000,
      itemHeight: 50,
      containerHeight: 500,
      total: 100,
      overscan: 0,
    })
    expect(r.startIndex).toBe(20) // 1000 / 50
    expect(r.endIndex).toBe(30)
  })

  it('itemHeight inválido devuelve rango vacío', () => {
    expect(
      calcularRango({ scrollTop: 0, itemHeight: 0, containerHeight: 500, total: 100 }),
    ).toEqual({
      startIndex: 0,
      endIndex: 0,
      visibleCount: 0,
    })
  })
})
