// `replicarGastoRecurrente` proyecta un gasto planeado a los 12 meses
// siguientes. Lo hacía con un bucle de 12 iteraciones, cada una con su
// propio SELECT del plan mensual, su posible INSERT del plan y el INSERT
// del gasto — hasta ~36 round trips secuenciales contra Supabase, y
// FUERA de cualquier transacción: si el mes 7 fallaba, quedaban 6 filas
// sueltas y ningún error que las limpiara.
//
// `planificarMesesRecurrentes` extrae el cálculo (qué meses y con qué
// fecha) para poder resolverlo de una vez y batchear el resto.

import { describe, it, expect } from 'vitest'
import { planificarMesesRecurrentes } from '../server/utils/recurrente.js'

describe('planificarMesesRecurrentes', () => {
  it('proyecta 12 meses a partir del siguiente', () => {
    const r = planificarMesesRecurrentes({ mesOrigen: 1, anioOrigen: 2026, diaOriginal: 15 })
    expect(r).toHaveLength(12)
    expect(r[0]).toEqual({ mes: 2, anio: 2026, fecha: '2026-02-15' })
    expect(r[11]).toEqual({ mes: 1, anio: 2027, fecha: '2027-01-15' })
  })

  it('cruza el año correctamente', () => {
    const r = planificarMesesRecurrentes({ mesOrigen: 11, anioOrigen: 2026, diaOriginal: 3 })
    expect(r[0]).toEqual({ mes: 12, anio: 2026, fecha: '2026-12-03' })
    expect(r[1]).toEqual({ mes: 1, anio: 2027, fecha: '2027-01-03' })
  })

  it('ajusta el día 31 al último día de cada mes corto', () => {
    const r = planificarMesesRecurrentes({ mesOrigen: 1, anioOrigen: 2026, diaOriginal: 31 })
    const porMes = Object.fromEntries(r.map((x) => [`${x.anio}-${x.mes}`, x.fecha]))
    // 2026 no es bisiesto: febrero tiene 28.
    expect(porMes['2026-2']).toBe('2026-02-28')
    expect(porMes['2026-4']).toBe('2026-04-30') // abril, 30 días
    expect(porMes['2026-3']).toBe('2026-03-31') // marzo, 31 días
  })

  it('respeta el 29 de febrero en año bisiesto', () => {
    // 2028 es bisiesto. Origen enero 2028 → febrero 2028 admite día 29.
    const r = planificarMesesRecurrentes({ mesOrigen: 1, anioOrigen: 2028, diaOriginal: 31 })
    expect(r[0]).toEqual({ mes: 2, anio: 2028, fecha: '2028-02-29' })
  })

  it('no repite ningún par mes/año', () => {
    const r = planificarMesesRecurrentes({ mesOrigen: 6, anioOrigen: 2026, diaOriginal: 10 })
    const claves = new Set(r.map((x) => `${x.anio}-${x.mes}`))
    expect(claves.size).toBe(12)
  })

  it('nunca incluye el mes de origen', () => {
    const r = planificarMesesRecurrentes({ mesOrigen: 5, anioOrigen: 2026, diaOriginal: 1 })
    expect(r.some((x) => x.mes === 5 && x.anio === 2026)).toBe(false)
  })

  it('acepta una cantidad distinta de meses', () => {
    const r = planificarMesesRecurrentes({
      mesOrigen: 1,
      anioOrigen: 2026,
      diaOriginal: 5,
      cantidad: 3,
    })
    expect(r.map((x) => x.fecha)).toEqual(['2026-02-05', '2026-03-05', '2026-04-05'])
  })
})
