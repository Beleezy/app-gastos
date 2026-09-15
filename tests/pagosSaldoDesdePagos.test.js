// Saldo de una deuda recalculado desde la SUMA de sus pagos vivos.
//
// Editar o revertir un pago recalculaba el pendiente en JS con valores
// leídos FUERA de la transacción (`pendiente + montoRevertido`,
// `original - (suma - viejo + nuevo)`) y escribía el resultado absoluto:
// la misma clase de lost update que cerró el PR #100 en `registrarPago`.
// Dos reversiones concurrentes sobre la misma deuda partían del mismo
// pendiente y la segunda pisaba a la primera.
//
// La regla pura vive aquí: dado el monto original y lo pagado (sumado
// dentro de la transacción, con la deuda bloqueada), qué pendiente y qué
// estado corresponden. El servicio no reimplementa la aritmética.

import { describe, it, expect } from 'vitest'
import { calcularSaldoDesdePagos } from '../server/utils/pagosMath.js'

describe('calcularSaldoDesdePagos', () => {
  it('sin pagos la deuda vuelve a pendiente por el monto original', () => {
    expect(calcularSaldoDesdePagos({ montoOriginal: '100.00', totalPagado: 0 })).toEqual({
      nuevoPendiente: 100,
      nuevoEstado: 'pendiente',
    })
  })

  it('con pagos parciales queda parcial', () => {
    expect(calcularSaldoDesdePagos({ montoOriginal: 100, totalPagado: '30.50' })).toEqual({
      nuevoPendiente: 69.5,
      nuevoEstado: 'parcial',
    })
  })

  it('pagada por completo (o de más) queda en pagado con saldo 0', () => {
    expect(calcularSaldoDesdePagos({ montoOriginal: 100, totalPagado: 100 })).toEqual({
      nuevoPendiente: 0,
      nuevoEstado: 'pagado',
    })
    expect(calcularSaldoDesdePagos({ montoOriginal: 100, totalPagado: 120 })).toEqual({
      nuevoPendiente: 0,
      nuevoEstado: 'pagado',
    })
  })

  it('redondea a céntimos en vez de arrastrar drift binario', () => {
    // 0.30 - 0.1 en binario es 0.19999999999999998.
    expect(calcularSaldoDesdePagos({ montoOriginal: 0.3, totalPagado: 0.1 }).nuevoPendiente).toBe(
      0.2,
    )
  })

  it('un residuo menor a medio céntimo cuenta como pagado', () => {
    expect(calcularSaldoDesdePagos({ montoOriginal: 10, totalPagado: 9.996 }).nuevoEstado).toBe(
      'pagado',
    )
  })

  it('entradas ilegibles no producen NaN: cae a pendiente por el original', () => {
    expect(calcularSaldoDesdePagos({ montoOriginal: 50, totalPagado: null })).toEqual({
      nuevoPendiente: 50,
      nuevoEstado: 'pendiente',
    })
  })
})
