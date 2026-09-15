import { describe, it, expect } from 'vitest'
import { uuidSchema, uuidRequerido, paginacionQuerySchema } from '../shared/schemas/common.js'

describe('uuidSchema', () => {
  it('acepta UUIDs válidos', () => {
    expect(uuidSchema.safeParse('550e8400-e29b-41d4-a716-446655440000').success).toBe(true)
  })
  it('rechaza strings no UUID', () => {
    expect(uuidSchema.safeParse('not-a-uuid').success).toBe(false)
    expect(uuidSchema.safeParse('123').success).toBe(false)
  })
})

describe('uuidRequerido', () => {
  // `idSchema` (uuid | entero | string numérico) se eliminó: todos los ids de
  // la base son uuid y la unión dejaba pasar valores que reventaban en
  // Postgres. Lo que queda es un uuid con mensaje propio para la ausencia.
  it('acepta un UUID', () => {
    expect(uuidRequerido('Falta').safeParse('550e8400-e29b-41d4-a716-446655440000').success).toBe(
      true,
    )
  })
  it('usa el mensaje propio cuando falta y uno genérico cuando la forma es mala', () => {
    const ausente = uuidRequerido('La categoría es obligatoria').safeParse(undefined)
    expect(ausente.success).toBe(false)
    expect(ausente.error.issues[0].message).toBe('La categoría es obligatoria')
    const malo = uuidRequerido('La categoría es obligatoria').safeParse('abc')
    expect(malo.success).toBe(false)
    expect(malo.error.issues[0].message).toBe('Identificador inválido')
    expect(uuidRequerido('Falta').safeParse(42).success).toBe(false)
  })
})

describe('paginacionQuerySchema', () => {
  it('coerce limit string→number', () => {
    const r = paginacionQuerySchema.safeParse({ limit: '50' })
    expect(r.success).toBe(true)
    expect(r.data.limit).toBe(50)
  })
  it('rechaza limit > 200', () => {
    expect(paginacionQuerySchema.safeParse({ limit: 500 }).success).toBe(false)
  })
  it('cursor opcional', () => {
    expect(paginacionQuerySchema.safeParse({}).success).toBe(true)
  })
})
