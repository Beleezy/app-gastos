import { describe, it, expect } from 'vitest'
import { rankearOpciones } from '../composables/useOpcionesScoring.js'

describe('rankearOpciones', () => {
  it('vacío devuelve []', () => {
    expect(rankearOpciones([])).toEqual([])
    expect(rankearOpciones(null)).toEqual([])
  })

  it('opción más barata gana cuando rango y manual iguales', () => {
    const r = rankearOpciones([
      { id: 'A', precioPromedio: 100, precioMin: 100, precioMax: 100 },
      { id: 'B', precioPromedio: 50, precioMin: 50, precioMax: 50 },
      { id: 'C', precioPromedio: 200, precioMin: 200, precioMax: 200 },
    ])
    expect(r[0].id).toBe('B')
    expect(r[r.length - 1].id).toBe('C')
  })

  it('rango pequeño (precio confiable) ayuda', () => {
    const r = rankearOpciones([
      { id: 'preciso', precioPromedio: 105, precioMin: 100, precioMax: 110 },
      { id: 'volatil', precioPromedio: 105, precioMin: 50, precioMax: 200 },
    ])
    expect(r[0].id).toBe('preciso')
  })

  it('prioridadManual influye', () => {
    const r = rankearOpciones([
      { id: 'caro_pero_preferido', precioPromedio: 200, precioMin: 200, precioMax: 200, prioridadManual: 1 },
      { id: 'barato_no_preferido', precioPromedio: 50, precioMin: 50, precioMax: 50, prioridadManual: 0 },
    ])
    // pesoPrecio 0.6 vs pesoManual 0.15: barato sigue ganando
    expect(r[0].id).toBe('barato_no_preferido')
  })

  it('agrega _score y _precioBase', () => {
    const r = rankearOpciones([
      { id: 'X', precioPromedio: 100, precioMin: 100, precioMax: 100 },
    ])
    expect(r[0]._score).toBeDefined()
    expect(r[0]._precioBase).toBe(100)
  })

  it('ignora opciones sin precio', () => {
    const r = rankearOpciones([
      { id: 'A', precioPromedio: 100, precioMin: 100, precioMax: 100 },
      { id: 'B', precioPromedio: null, precioMin: null, precioMax: null },
    ])
    expect(r).toHaveLength(1)
    expect(r[0].id).toBe('A')
  })
})
