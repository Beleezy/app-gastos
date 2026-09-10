// Schemas de ahorros. Existían exportados y SIN USAR mientras los tres
// handlers de escritura leían `readBody` crudo: POST /api/ahorros,
// POST /api/ahorros/medios y PUT /api/ahorros/metas.
//
// Cinco cuerpos distintos llegaban al INSERT y devolvían un 500 con la
// consulta y sus parámetros en el mensaje. Esta suite fija lo que cada
// schema tiene que rechazar ANTES de tocar la base.

import { describe, it, expect } from 'vitest'
import {
  ahorroCreateSchema,
  ahorroUpdateSchema,
  medioAhorroCreateSchema,
  metaAhorroSchema,
} from '../shared/schemas/categorias.js'

const UUID = '3f51518f-b0ef-4c4f-a0f0-b3a7c3caa01c'
const base = { monto: 100, fecha: '2026-09-05' }

describe('ahorroCreateSchema', () => {
  it('acepta el cuerpo mínimo que manda el formulario', () => {
    expect(ahorroCreateSchema.parse(base)).toMatchObject({ monto: 100, fecha: '2026-09-05' })
  })

  it('rechaza un monto que no es número', () => {
    // Llegaba a `String(body.monto)` y de ahí a una columna NUMERIC.
    expect(ahorroCreateSchema.safeParse({ ...base, monto: 'mucho' }).success).toBe(false)
  })

  it('rechaza monto negativo y cero', () => {
    expect(ahorroCreateSchema.safeParse({ ...base, monto: -500 }).success).toBe(false)
    expect(ahorroCreateSchema.safeParse({ ...base, monto: 0 }).success).toBe(false)
  })

  it('rechaza un monto fuera de rango de la columna', () => {
    expect(ahorroCreateSchema.safeParse({ ...base, monto: 1e30 }).success).toBe(false)
  })

  it('rechaza una fecha que no es YYYY-MM-DD', () => {
    // `new Date('no-es-fecha' + 'T00:00:00')` daba NaN y el handler
    // insertaba mes/anio NaN.
    for (const fecha of ['no-es-fecha', '05/09/2026', '2026-9-5', '']) {
      expect(ahorroCreateSchema.safeParse({ ...base, fecha }).success, fecha).toBe(false)
    }
  })

  it('exige que medioAhorroId sea uuid, no cualquier string o número', () => {
    expect(ahorroCreateSchema.safeParse({ ...base, medioAhorroId: 'abc-123' }).success).toBe(false)
    expect(ahorroCreateSchema.safeParse({ ...base, medioAhorroId: 42 }).success).toBe(false)
    expect(ahorroCreateSchema.safeParse({ ...base, medioAhorroId: UUID }).success).toBe(true)
    expect(ahorroCreateSchema.safeParse({ ...base, medioAhorroId: null }).success).toBe(true)
  })

  it('descarta usuarioId del cuerpo (mass assignment)', () => {
    const parsed = ahorroCreateSchema.parse({ ...base, usuarioId: 'otro' })
    expect(parsed).not.toHaveProperty('usuarioId')
  })

  it('mes y anio del cuerpo no sobreviven: se derivan de la fecha', () => {
    const parsed = ahorroCreateSchema.parse({ ...base, mes: 1, anio: 1999 })
    expect(parsed).not.toHaveProperty('mes')
    expect(parsed).not.toHaveProperty('anio')
  })
})

describe('ahorroUpdateSchema', () => {
  it('hereda la exigencia de uuid en medioAhorroId', () => {
    expect(ahorroUpdateSchema.safeParse({ medioAhorroId: 'abc-123' }).success).toBe(false)
  })

  it('rechaza un cuerpo vacío', () => {
    expect(ahorroUpdateSchema.safeParse({}).success).toBe(false)
  })
})

describe('medioAhorroCreateSchema', () => {
  it('acepta lo que manda el formulario', () => {
    expect(medioAhorroCreateSchema.parse({ nombre: 'BCP', icono: '🏦' })).toMatchObject({
      nombre: 'BCP',
    })
  })

  it('exige nombre no vacío', () => {
    expect(medioAhorroCreateSchema.safeParse({ nombre: '   ' }).success).toBe(false)
    expect(medioAhorroCreateSchema.safeParse({}).success).toBe(false)
  })

  it('rechaza un orden que no es entero: la columna es integer', () => {
    expect(medioAhorroCreateSchema.safeParse({ nombre: 'X', orden: 'x' }).success).toBe(false)
    expect(medioAhorroCreateSchema.safeParse({ nombre: 'X', orden: 1.5 }).success).toBe(false)
  })

  it('acota el nombre al ancho de la columna', () => {
    expect(medioAhorroCreateSchema.safeParse({ nombre: 'x'.repeat(81) }).success).toBe(false)
  })
})

describe('metaAhorroSchema', () => {
  it('acepta una meta global sin mes ni año', () => {
    expect(metaAhorroSchema.safeParse({ tipo: 'global', montoObjetivo: 5000 }).success).toBe(true)
  })

  it('acepta una meta mensual con mes y año', () => {
    const r = metaAhorroSchema.safeParse({
      tipo: 'mensual',
      montoObjetivo: 500,
      mes: 9,
      anio: 2026,
    })
    expect(r.success).toBe(true)
  })

  it('rechaza una meta mensual sin mes ni año', () => {
    // Se guardaba con NULL, y la lectura la busca por (mes, anio): quedaba
    // escrita e invisible.
    expect(metaAhorroSchema.safeParse({ tipo: 'mensual', montoObjetivo: 500 }).success).toBe(false)
  })

  it('rechaza un mes que no es número: iba a un eq() contra integer', () => {
    const r = metaAhorroSchema.safeParse({
      tipo: 'mensual',
      montoObjetivo: 500,
      mes: 'abc',
      anio: 2026,
    })
    expect(r.success).toBe(false)
  })

  it('rechaza meses fuera de 1-12', () => {
    for (const mes of [0, 13, -1]) {
      const r = metaAhorroSchema.safeParse({ tipo: 'mensual', montoObjetivo: 5, mes, anio: 2026 })
      expect(r.success, `mes=${mes}`).toBe(false)
    }
  })

  it('rechaza un tipo desconocido', () => {
    expect(metaAhorroSchema.safeParse({ tipo: 'anual', montoObjetivo: 5 }).success).toBe(false)
  })

  it('rechaza un objetivo no positivo', () => {
    expect(metaAhorroSchema.safeParse({ tipo: 'global', montoObjetivo: 0 }).success).toBe(false)
    expect(metaAhorroSchema.safeParse({ tipo: 'global', montoObjetivo: -1 }).success).toBe(false)
  })
})
