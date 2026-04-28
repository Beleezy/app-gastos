import { describe, it, expect } from 'vitest'
import { aplicarFiltros } from '../composables/useFiltrosGastos.js'

const gastos = [
  { concepto: 'Pan en panadería', monto: 5, fecha: '2026-04-01', categoriaId: 1, metodoRegistro: 'manual' },
  { concepto: 'Uber al trabajo', monto: 15, fecha: '2026-04-15', categoriaId: 2, metodoRegistro: 'voz' },
  { concepto: 'Cena restaurante', monto: 80, fecha: '2026-04-20', categoriaId: 1, metodoRegistro: 'foto', notas: 'cumple Ana' },
  { concepto: 'Cine', monto: 25, fecha: '2026-03-30', categoriaId: 3, metodoRegistro: 'manual' },
]

describe('aplicarFiltros', () => {
  it('sin filtros devuelve todo', () => {
    expect(aplicarFiltros(gastos, {}).length).toBe(4)
  })

  it('rango de fechas', () => {
    const r = aplicarFiltros(gastos, { rangoFechas: { desde: '2026-04-01', hasta: '2026-04-30' } })
    expect(r.length).toBe(3)
  })

  it('categorías', () => {
    expect(aplicarFiltros(gastos, { categoriaIds: [1] }).length).toBe(2)
    expect(aplicarFiltros(gastos, { categoriaIds: [2, 3] }).length).toBe(2)
  })

  it('métodos', () => {
    expect(aplicarFiltros(gastos, { metodos: ['voz'] }).length).toBe(1)
    expect(aplicarFiltros(gastos, { metodos: ['voz', 'foto'] }).length).toBe(2)
  })

  it('rango de montos', () => {
    expect(aplicarFiltros(gastos, { montoMin: 20 }).length).toBe(2)
    expect(aplicarFiltros(gastos, { montoMin: 10, montoMax: 30 }).length).toBe(2)
  })

  it('texto en concepto', () => {
    expect(aplicarFiltros(gastos, { texto: 'panaderia' }).length).toBe(1)
    expect(aplicarFiltros(gastos, { texto: 'PAN' }).length).toBe(1)
  })

  it('texto en notas', () => {
    expect(aplicarFiltros(gastos, { texto: 'cumple' }).length).toBe(1)
  })

  it('combinación de filtros', () => {
    const r = aplicarFiltros(gastos, {
      rangoFechas: { desde: '2026-04-01' },
      categoriaIds: [1],
      montoMin: 50,
    })
    expect(r.length).toBe(1)
    expect(r[0].concepto).toContain('Cena')
  })
})
