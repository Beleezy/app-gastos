import { describe, it, expect } from 'vitest'
import { matchDuplicados } from '../server/services/gastos.service.js'

describe('matchDuplicados', () => {
  it('detecta exact match', () => {
    const r = matchDuplicados(
      [{ concepto: 'Pan', monto: 5, fecha: '2026-04-01' }],
      [{ id: 1, concepto: 'Pan', monto: 5, fecha: '2026-04-01' }],
    )
    expect(r[0].duplicados).toHaveLength(1)
  })

  it('tolerancia de monto ±0.5%', () => {
    const r = matchDuplicados(
      [{ concepto: 'Café', monto: 100, fecha: '2026-04-01' }],
      [{ id: 1, concepto: 'Café', monto: 100.4, fecha: '2026-04-01' }],
    )
    expect(r[0].duplicados).toHaveLength(1)
  })

  it('rechaza monto fuera de tolerancia', () => {
    const r = matchDuplicados(
      [{ concepto: 'Café', monto: 100, fecha: '2026-04-01' }],
      [{ id: 1, concepto: 'Café', monto: 150, fecha: '2026-04-01' }],
    )
    expect(r[0].duplicados).toHaveLength(0)
  })

  it('match por prefijo del concepto', () => {
    const r = matchDuplicados(
      [{ concepto: 'Pan integral grande', monto: 5, fecha: '2026-04-01' }],
      [{ id: 1, concepto: 'Pan integral', monto: 5, fecha: '2026-04-01' }],
    )
    expect(r[0].duplicados).toHaveLength(1)
  })

  it('rechaza fechas distintas aunque monto y concepto coincidan', () => {
    const r = matchDuplicados(
      [{ concepto: 'X', monto: 5, fecha: '2026-04-01' }],
      [{ id: 1, concepto: 'X', monto: 5, fecha: '2026-04-02' }],
    )
    expect(r[0].duplicados).toHaveLength(0)
  })

  it('input vacío', () => {
    expect(matchDuplicados([], [])).toEqual([])
    expect(matchDuplicados(null, [])).toEqual([])
  })
})
