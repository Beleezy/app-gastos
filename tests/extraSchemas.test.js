import { describe, it, expect } from 'vitest'
import { uuidSchema, idSchema, paginacionQuerySchema } from '../shared/schemas/common.js'

describe('uuidSchema', () => {
  it('acepta UUIDs válidos', () => {
    expect(uuidSchema.safeParse('550e8400-e29b-41d4-a716-446655440000').success).toBe(true)
  })
  it('rechaza strings no UUID', () => {
    expect(uuidSchema.safeParse('not-a-uuid').success).toBe(false)
    expect(uuidSchema.safeParse('123').success).toBe(false)
  })
})

describe('idSchema', () => {
  it('acepta UUID, entero o string numérico', () => {
    expect(idSchema.safeParse('550e8400-e29b-41d4-a716-446655440000').success).toBe(true)
    expect(idSchema.safeParse(42).success).toBe(true)
    expect(idSchema.safeParse('42').success).toBe(true)
  })
  it('rechaza otros formatos', () => {
    expect(idSchema.safeParse('abc').success).toBe(false)
    expect(idSchema.safeParse(-1).success).toBe(false)
    expect(idSchema.safeParse(1.5).success).toBe(false)
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
