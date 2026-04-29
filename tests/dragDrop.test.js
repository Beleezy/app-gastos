import { describe, it, expect } from 'vitest'
import { reordenar } from '../composables/useDragDrop.js'

describe('reordenar', () => {
  it('mismo índice no cambia nada (clona el array)', () => {
    const arr = [1, 2, 3]
    const r = reordenar(arr, 1, 1)
    expect(r).toEqual([1, 2, 3])
    expect(r).not.toBe(arr)
  })

  it('mueve adelante', () => {
    expect(reordenar([1, 2, 3, 4], 0, 2)).toEqual([2, 3, 1, 4])
  })

  it('mueve atrás', () => {
    expect(reordenar([1, 2, 3, 4], 3, 0)).toEqual([4, 1, 2, 3])
  })

  it('clamp del target a longitud', () => {
    expect(reordenar([1, 2, 3], 0, 999)).toEqual([2, 3, 1])
  })

  it('rechaza fromIndex inválido', () => {
    expect(reordenar([1, 2, 3], -1, 0)).toEqual([1, 2, 3])
    expect(reordenar([1, 2, 3], 5, 0)).toEqual([1, 2, 3])
  })

  it('input no array → []', () => {
    expect(reordenar(null, 0, 0)).toEqual([])
  })
})
