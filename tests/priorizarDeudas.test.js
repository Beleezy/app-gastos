import { describe, it, expect } from 'vitest'
import { priorizarDeudasParaPago } from '../server/utils/pagosMath.js'

describe('priorizarDeudasParaPago', () => {
  const HOY = '2026-04-28'

  it('vencidas primero, ordenadas por fechaPago ascendente', () => {
    const deudas = [
      { id: 'b', fechaPago: '2026-04-20', fechaCreacion: '2026-01-01' },
      { id: 'a', fechaPago: '2026-04-10', fechaCreacion: '2026-01-01' },
      { id: 'futura', fechaPago: '2026-05-15', fechaCreacion: '2026-01-01' },
    ]
    const r = priorizarDeudasParaPago(deudas, HOY).map((d) => d.id)
    expect(r).toEqual(['a', 'b', 'futura'])
  })

  it('sin fecha entran después de las vencidas, antes de las futuras', () => {
    const deudas = [
      { id: 'futura', fechaPago: '2026-05-15', fechaCreacion: '2026-03-01' },
      { id: 'sinFecha', fechaPago: null, fechaCreacion: '2026-02-01' },
      { id: 'vencida', fechaPago: '2026-04-10', fechaCreacion: '2026-01-01' },
    ]
    const r = priorizarDeudasParaPago(deudas, HOY).map((d) => d.id)
    expect(r).toEqual(['vencida', 'sinFecha', 'futura'])
  })

  it('sin fecha se ordenan por fechaCreacion asc', () => {
    const deudas = [
      { id: 'b', fechaPago: null, fechaCreacion: '2026-03-01' },
      { id: 'a', fechaPago: null, fechaCreacion: '2026-02-01' },
      { id: 'c', fechaPago: null, fechaCreacion: '2026-04-01' },
    ]
    expect(priorizarDeudasParaPago(deudas, HOY).map((d) => d.id)).toEqual(['a', 'b', 'c'])
  })

  it('input vacío devuelve []', () => {
    expect(priorizarDeudasParaPago([], HOY)).toEqual([])
    expect(priorizarDeudasParaPago(null, HOY)).toEqual([])
  })
})
