import { describe, it, expect } from 'vitest'
import { clasificarDeuda, deudasParaRecordar } from '../server/utils/deudaEstado.js'

const HOY = new Date(2026, 3, 28) // 28 abril 2026

describe('clasificarDeuda', () => {
  it('marca pagada cuando saldo es 0', () => {
    expect(clasificarDeuda({ montoPendiente: 0 }, HOY).urgencia).toBe('pagada')
  })

  it('saldo invalido se trata como pagada', () => {
    expect(clasificarDeuda({ montoPendiente: 'abc' }, HOY).urgencia).toBe('pagada')
  })

  it('sin fecha vencimiento → normal', () => {
    const r = clasificarDeuda({ montoPendiente: 100 }, HOY)
    expect(r.urgencia).toBe('normal')
    expect(r.vencida).toBe(false)
  })

  it('vencida si fecha pasada', () => {
    const r = clasificarDeuda({ montoPendiente: 100, fechaVencimiento: '2026-04-20' }, HOY)
    expect(r.vencida).toBe(true)
    expect(r.urgencia).toBe('vencida')
    expect(r.diasRestantes).toBe(-8)
  })

  it('urgente si vence hoy o mañana', () => {
    expect(clasificarDeuda({ montoPendiente: 100, fechaVencimiento: '2026-04-28' }, HOY).urgencia).toBe('urgente')
    expect(clasificarDeuda({ montoPendiente: 100, fechaVencimiento: '2026-04-29' }, HOY).urgencia).toBe('urgente')
  })

  it('pronto si vence en menos de 7 dias', () => {
    expect(clasificarDeuda({ montoPendiente: 100, fechaVencimiento: '2026-05-03' }, HOY).urgencia).toBe('pronto')
  })

  it('normal si > 7 dias', () => {
    expect(clasificarDeuda({ montoPendiente: 100, fechaVencimiento: '2026-06-01' }, HOY).urgencia).toBe('normal')
  })
})

describe('deudasParaRecordar', () => {
  it('filtra y ordena por dias restantes ascendente', () => {
    const lista = [
      { id: 1, montoPendiente: 100, fechaVencimiento: '2026-05-15' }, // normal, descartado
      { id: 2, montoPendiente: 100, fechaVencimiento: '2026-04-25' }, // vencida (-3)
      { id: 3, montoPendiente: 100, fechaVencimiento: '2026-05-03' }, // pronto (5)
      { id: 4, montoPendiente: 100, fechaVencimiento: '2026-04-28' }, // urgente (0)
      { id: 5, montoPendiente: 0, fechaVencimiento: '2026-04-20' },   // pagada
    ]
    const r = deudasParaRecordar(lista, HOY)
    expect(r.map((x) => x.id)).toEqual([2, 4, 3])
  })
})
