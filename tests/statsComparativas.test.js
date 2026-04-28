import { describe, it, expect } from 'vitest'
import {
  totalGastos,
  porcentajeCambio,
  agruparPorCategoria,
  topCategorias,
  diferenciaPorCategoria,
  promedioDiario,
  generarInsights,
} from '../composables/useStatsComparativas.js'

const gastos = [
  { concepto: 'A', monto: 10, fecha: '2026-04-01', categoriaNombre: 'Comida' },
  { concepto: 'B', monto: 20, fecha: '2026-04-01', categoriaNombre: 'Comida' },
  { concepto: 'C', monto: 30, fecha: '2026-04-02', categoriaNombre: 'Transporte' },
]

describe('totalGastos', () => {
  it('suma con redondeo', () => {
    expect(totalGastos(gastos)).toBe(60)
    expect(totalGastos([])).toBe(0)
    expect(totalGastos(null)).toBe(0)
  })
})

describe('porcentajeCambio', () => {
  it('null cuando anterior es 0', () => {
    expect(porcentajeCambio(10, 0)).toBeNull()
  })
  it('+50% si pasa de 100 a 150', () => {
    expect(porcentajeCambio(150, 100)).toBe(50)
  })
})

describe('agruparPorCategoria', () => {
  it('agrupa correctamente', () => {
    const r = agruparPorCategoria(gastos)
    expect(r.Comida.total).toBe(30)
    expect(r.Comida.count).toBe(2)
    expect(r.Transporte.total).toBe(30)
  })
})

describe('topCategorias', () => {
  it('ordena por total desc', () => {
    const r = topCategorias(gastos, 5)
    expect(r[0].total).toBeGreaterThanOrEqual(r[r.length - 1].total)
  })
})

describe('diferenciaPorCategoria', () => {
  it('calcula delta y % de cambio', () => {
    const anteriores = [{ monto: 10, categoriaNombre: 'Comida' }]
    const r = diferenciaPorCategoria(gastos, anteriores)
    const comida = r.find((x) => x.categoria === 'Comida')
    expect(comida.delta).toBe(20)
    expect(comida.porcentaje).toBe(200)
  })
})

describe('promedioDiario', () => {
  it('total dividido por fechas únicas', () => {
    expect(promedioDiario(gastos)).toBe(30) // 60 / 2 fechas
    expect(promedioDiario([])).toBe(0)
  })
})

describe('generarInsights', () => {
  it('detecta subida del total', () => {
    const ins = generarInsights({
      actuales: [{ monto: 200, fecha: '2026-04-01' }],
      anteriores: [{ monto: 100, fecha: '2026-03-01' }],
    })
    expect(ins[0].tipo).toBe('up')
    expect(ins[0].texto).toContain('más')
  })
  it('detecta bajada', () => {
    const ins = generarInsights({
      actuales: [{ monto: 50, fecha: '2026-04-01' }],
      anteriores: [{ monto: 200, fecha: '2026-03-01' }],
    })
    expect(ins[0].tipo).toBe('down')
  })
  it('lista vacía no rompe', () => {
    expect(generarInsights({ actuales: [], anteriores: [] })).toEqual([])
  })
})
