import { describe, it, expect } from 'vitest'
import { gastoCreateSchema, gastosBulkCreateSchema } from '../shared/schemas/gastos.js'
import { deudaCreateSchema, pagoCreateSchema } from '../shared/schemas/deudas.js'
import { planMensualSchema } from '../shared/schemas/planificador.js'

describe('gastoCreateSchema', () => {
  it('acepta gasto válido', () => {
    const r = gastoCreateSchema.safeParse({
      concepto: 'Pan',
      monto: 5,
      fecha: '2026-04-28',
      categoriaId: 1,
    })
    expect(r.success).toBe(true)
  })

  it('rechaza concepto vacío', () => {
    const r = gastoCreateSchema.safeParse({ concepto: '', monto: 5, fecha: '2026-04-28' })
    expect(r.success).toBe(false)
  })

  it('rechaza monto cero o negativo', () => {
    expect(gastoCreateSchema.safeParse({ concepto: 'X', monto: 0, fecha: '2026-04-28' }).success).toBe(false)
    expect(gastoCreateSchema.safeParse({ concepto: 'X', monto: -5, fecha: '2026-04-28' }).success).toBe(false)
  })

  it('rechaza fecha mal formateada', () => {
    expect(gastoCreateSchema.safeParse({ concepto: 'X', monto: 5, fecha: '28/04/2026' }).success).toBe(false)
  })

  it('rechaza monto absurdo', () => {
    expect(gastoCreateSchema.safeParse({ concepto: 'X', monto: 1e10, fecha: '2026-04-28' }).success).toBe(false)
  })
})

describe('gastosBulkCreateSchema', () => {
  it('rechaza lista vacía', () => {
    expect(gastosBulkCreateSchema.safeParse({ gastos: [] }).success).toBe(false)
  })

  it('rechaza más de 500', () => {
    const lista = Array.from({ length: 501 }, () => ({
      concepto: 'X',
      monto: 1,
      fecha: '2026-04-28',
    }))
    expect(gastosBulkCreateSchema.safeParse({ gastos: lista }).success).toBe(false)
  })
})

describe('deudaCreateSchema', () => {
  it('exige persona o personaNombre', () => {
    const r = deudaCreateSchema.safeParse({
      tipoDeuda: 'me_deben',
      concepto: 'Préstamo',
      monto: 100,
    })
    expect(r.success).toBe(false)
  })

  it('acepta con personaNombre', () => {
    const r = deudaCreateSchema.safeParse({
      personaNombre: 'Juan',
      tipoDeuda: 'me_deben',
      concepto: 'Préstamo',
      monto: 100,
    })
    expect(r.success).toBe(true)
  })

  it('rechaza tipoDeuda inválido', () => {
    expect(
      deudaCreateSchema.safeParse({
        personaNombre: 'Juan',
        tipoDeuda: 'otro',
        concepto: 'X',
        monto: 5,
      }).success,
    ).toBe(false)
  })
})

describe('pagoCreateSchema', () => {
  it('exige todos los campos', () => {
    expect(pagoCreateSchema.safeParse({}).success).toBe(false)
    expect(
      pagoCreateSchema.safeParse({ deudaId: 1, monto: 10, fechaPago: '2026-04-28' }).success,
    ).toBe(true)
  })
})

describe('planMensualSchema', () => {
  it('rechaza mes fuera de rango', () => {
    expect(planMensualSchema.safeParse({ mes: 0, anio: 2026 }).success).toBe(false)
    expect(planMensualSchema.safeParse({ mes: 13, anio: 2026 }).success).toBe(false)
  })

  it('acepta mes válido sin presupuesto', () => {
    expect(planMensualSchema.safeParse({ mes: 4, anio: 2026 }).success).toBe(true)
  })
})
