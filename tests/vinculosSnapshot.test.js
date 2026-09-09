// `tomarSnapshot` (checkpoints de vínculos) hacía, por cada una de las dos
// personas del par: 1 query de deudas + 1 query de pagos POR DEUDA. Con el
// volumen del seed de pruebas (119 deudas) eso son ~240 round trips
// secuenciales dentro de una transacción — que además mantiene los locks
// abiertos todo ese tiempo.
//
// `agruparPagosPorDeuda` es la parte pura: dadas las deudas y TODOS sus
// pagos traídos de una vez, arma la misma estructura que antes se construía
// consultando una por una.

import { describe, it, expect } from 'vitest'
import { agruparPagosPorDeuda } from '../server/utils/vinculos.js'

const deuda = (id, over = {}) => ({
  id,
  concepto: `Deuda ${id}`,
  tipoDeuda: 'me_deben',
  montoOriginal: '100.00',
  montoPendiente: '50.00',
  fechaCreacion: '2026-01-01',
  fechaPago: null,
  estado: 'parcial',
  notas: null,
  vinculoDeudaId: null,
  ...over,
})

const pago = (id, deudaId, over = {}) => ({
  id,
  deudaId,
  montoPagado: '50.00',
  fechaPago: '2026-02-01',
  metodoPago: 'efectivo',
  notas: null,
  vinculoPagoId: null,
  ...over,
})

describe('agruparPagosPorDeuda', () => {
  it('asocia cada pago a su deuda', () => {
    const r = agruparPagosPorDeuda(
      [deuda('d1'), deuda('d2')],
      [pago('p1', 'd1'), pago('p2', 'd2'), pago('p3', 'd1')],
    )
    expect(r).toHaveLength(2)
    expect(r[0].pagos.map((p) => p.id)).toEqual(['p1', 'p3'])
    expect(r[1].pagos.map((p) => p.id)).toEqual(['p2'])
  })

  it('una deuda sin pagos queda con lista vacía, no sin la propiedad', () => {
    const r = agruparPagosPorDeuda([deuda('d1')], [])
    expect(r[0].pagos).toEqual([])
  })

  it('conserva el orden de las deudas recibidas', () => {
    const r = agruparPagosPorDeuda([deuda('z'), deuda('a'), deuda('m')], [])
    expect(r.map((d) => d.id)).toEqual(['z', 'a', 'm'])
  })

  it('ignora pagos de deudas que no están en la lista', () => {
    // Defensa: si la query de pagos trae de más, no debe inventar deudas.
    const r = agruparPagosPorDeuda([deuda('d1')], [pago('p1', 'd1'), pago('px', 'ajena')])
    expect(r).toHaveLength(1)
    expect(r[0].pagos.map((p) => p.id)).toEqual(['p1'])
  })

  it('proyecta exactamente los campos del snapshot, ni uno más', () => {
    // El snapshot se serializa a JSON y se guarda: si se cuelan columnas
    // nuevas de `deudas` (un campo interno, una nota privada) acabarían
    // dentro del checkpoint, que la otra parte del vínculo puede leer.
    const r = agruparPagosPorDeuda(
      [deuda('d1', { usuarioId: 'secreto', deletedAt: null, campoNuevo: 'x' })],
      [pago('p1', 'd1', { campoNuevo: 'y' })],
    )
    expect(Object.keys(r[0]).sort()).toEqual(
      [
        'concepto',
        'estado',
        'fechaCreacion',
        'fechaPago',
        'id',
        'montoOriginal',
        'montoPendiente',
        'notas',
        'pagos',
        'tipoDeuda',
        'vinculoDeudaId',
      ].sort(),
    )
    expect(Object.keys(r[0].pagos[0]).sort()).toEqual(
      ['fechaPago', 'id', 'metodoPago', 'montoPagado', 'notas', 'vinculoPagoId'].sort(),
    )
  })

  it('tolera listas vacías o ausentes', () => {
    expect(agruparPagosPorDeuda([], [])).toEqual([])
    expect(agruparPagosPorDeuda(undefined, undefined)).toEqual([])
  })

  it('no muta las entradas', () => {
    const ds = [deuda('d1')]
    const ps = [pago('p1', 'd1')]
    const copiaD = JSON.parse(JSON.stringify(ds))
    const copiaP = JSON.parse(JSON.stringify(ps))
    agruparPagosPorDeuda(ds, ps)
    expect(ds).toEqual(copiaD)
    expect(ps).toEqual(copiaP)
  })
})
