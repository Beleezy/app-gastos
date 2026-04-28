import { describe, it, expect } from 'vitest'
import { calcularSaldoTrasPago, distribuirPagoGlobal } from '../server/utils/pagosMath.js'

describe('calcularSaldoTrasPago', () => {
  it('pago exacto deja la deuda en pagado con saldo 0', () => {
    const r = calcularSaldoTrasPago({ pendienteActual: 100, montoPago: 100 })
    expect(r.nuevoPendiente).toBe(0)
    expect(r.nuevoEstado).toBe('pagado')
    expect(r.excede).toBe(false)
  })

  it('pago parcial ajusta saldo y deja parcial', () => {
    const r = calcularSaldoTrasPago({ pendienteActual: 100, montoPago: 30 })
    expect(r.nuevoPendiente).toBe(70)
    expect(r.nuevoEstado).toBe('parcial')
  })

  it('marca excede=true si supera el saldo', () => {
    const r = calcularSaldoTrasPago({ pendienteActual: 50, montoPago: 60 })
    expect(r.excede).toBe(true)
    expect(r.nuevoPendiente).toBe(50) // sin cambio
  })

  it('tolerancia: pagar 100.001 sobre 100 cuenta como pagado', () => {
    const r = calcularSaldoTrasPago({ pendienteActual: 100, montoPago: 100.001 })
    expect(r.excede).toBe(false)
    expect(r.nuevoEstado).toBe('pagado')
  })
})

describe('distribuirPagoGlobal', () => {
  const deudas = [
    { id: 'a', montoPendiente: 30, fechaCreacion: '2026-01-01' },
    { id: 'b', montoPendiente: 50, fechaCreacion: '2026-02-01' },
    { id: 'c', montoPendiente: 20, fechaCreacion: '2026-03-01' },
  ]

  it('FIFO consume primero la más antigua', () => {
    const r = distribuirPagoGlobal({ deudas, monto: 60, estrategia: 'fifo' })
    expect(r.asignaciones).toEqual([
      { deudaId: 'a', monto: 30 },
      { deudaId: 'b', monto: 30 },
    ])
    expect(r.sobrante).toBe(0)
  })

  it('LIFO consume primero la más reciente', () => {
    const r = distribuirPagoGlobal({ deudas, monto: 40, estrategia: 'lifo' })
    expect(r.asignaciones[0].deudaId).toBe('c')
    expect(r.asignaciones[1].deudaId).toBe('b')
    expect(r.asignaciones[1].monto).toBe(20)
  })

  it('monto mayor al total deja sobrante', () => {
    const r = distribuirPagoGlobal({ deudas, monto: 200 })
    expect(r.sobrante).toBe(100)
    expect(r.asignaciones.reduce((s, a) => s + a.monto, 0)).toBe(100)
  })

  it('no asigna a deudas con saldo 0', () => {
    const conCero = [...deudas, { id: 'd', montoPendiente: 0, fechaCreacion: '2026-04-01' }]
    const r = distribuirPagoGlobal({ deudas: conCero, monto: 10 })
    expect(r.asignaciones.find((a) => a.deudaId === 'd')).toBeUndefined()
  })

  it('rechaza monto inválido', () => {
    expect(distribuirPagoGlobal({ deudas, monto: 0 }).asignaciones).toEqual([])
    expect(distribuirPagoGlobal({ deudas, monto: -5 }).asignaciones).toEqual([])
  })
})
