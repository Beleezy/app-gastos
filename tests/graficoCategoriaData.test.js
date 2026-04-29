import { describe, it, expect } from 'vitest'
import {
  calcularGastosPorCategoria,
  compararPlanReal,
} from '../composables/useGraficoCategoriaData.js'

describe('calcularGastosPorCategoria', () => {
  it('lista vacía → cero', () => {
    const r = calcularGastosPorCategoria([])
    expect(r).toEqual({ items: [], total: 0, max: 0 })
  })

  it('agrupa, suma, ordena desc y calcula porcentaje', () => {
    const r = calcularGastosPorCategoria([
      { monto: 10, categoriaNombre: 'Comida' },
      { monto: 30, categoriaNombre: 'Transporte' },
      { monto: 20, categoriaNombre: 'Comida' },
    ])
    expect(r.total).toBe(60)
    expect(r.items[0]).toMatchObject({ categoria: 'Comida', total: 30, porcentaje: 50 })
    expect(r.items[1]).toMatchObject({ categoria: 'Transporte', total: 30, porcentaje: 50 })
    expect(r.max).toBe(30)
  })

  it('asigna color del default cuando no viene', () => {
    const r = calcularGastosPorCategoria([{ monto: 10, categoriaNombre: 'X' }])
    expect(r.items[0].color).toMatch(/^#/)
  })

  it('respeta color provisto', () => {
    const r = calcularGastosPorCategoria([
      { monto: 10, categoriaNombre: 'X', categoriaColor: '#abcdef' },
    ])
    expect(r.items[0].color).toBe('#abcdef')
  })
})

describe('compararPlanReal', () => {
  it('combina planificado vs real por categoría', () => {
    const r = compararPlanReal({
      planificados: [{ categoriaNombre: 'A', montoEstimado: 100 }],
      reales: [
        { categoriaNombre: 'A', monto: 120 },
        { categoriaNombre: 'B', monto: 30 },
      ],
    })
    const a = r.find((x) => x.categoria === 'A')
    const b = r.find((x) => x.categoria === 'B')
    expect(a.planificado).toBe(100)
    expect(a.real).toBe(120)
    expect(a.delta).toBe(20)
    expect(a.sobrepasado).toBe(true)
    expect(b.planificado).toBe(0)
    expect(b.sobrepasado).toBe(false) // sin plan, no se considera sobrepasado
  })

  it('lista vacía no rompe', () => {
    expect(compararPlanReal({})).toEqual([])
  })
})
