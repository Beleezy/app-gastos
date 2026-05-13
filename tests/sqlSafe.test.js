import { describe, it, expect } from 'vitest'
import { sanitizeString, escapeLikePattern, asIdentifier } from '../server/utils/sqlSafe.js'

describe('sanitizeString', () => {
  it('devuelve cadena vacía para null/undefined', () => {
    expect(sanitizeString(null)).toBe('')
    expect(sanitizeString(undefined)).toBe('')
  })

  it('quita NUL y caracteres de control', () => {
    expect(sanitizeString('ho\x00la\x07')).toBe('hola')
    expect(sanitizeString('a\x1Fb')).toBe('ab')
  })

  it('quita zero-width chars', () => {
    expect(sanitizeString('hola​mundo')).toBe('holamundo')
  })

  it('trim y limita longitud', () => {
    expect(sanitizeString('  abc  ')).toBe('abc')
    expect(sanitizeString('x'.repeat(100), 10)).toHaveLength(10)
  })
})

describe('escapeLikePattern', () => {
  it('escapa %, _ y \\ para que sean literales en LIKE/ILIKE', () => {
    expect(escapeLikePattern('100%')).toBe('100\\%')
    expect(escapeLikePattern('a_b')).toBe('a\\_b')
    expect(escapeLikePattern('a\\b')).toBe('a\\\\b')
  })

  it('combinaciones', () => {
    expect(escapeLikePattern('50% off_now')).toBe('50\\% off\\_now')
  })

  it('no toca texto normal', () => {
    expect(escapeLikePattern('hola mundo')).toBe('hola mundo')
  })
})

describe('asIdentifier', () => {
  it('acepta UUID v4-like', () => {
    const uuid = '12345678-1234-1234-1234-123456789012'
    expect(asIdentifier(uuid)).toBe(uuid)
  })

  it('acepta enteros positivos', () => {
    expect(asIdentifier(42)).toBe(42)
    expect(asIdentifier('42')).toBe('42')
  })

  it('rechaza valores inválidos', () => {
    expect(asIdentifier('1; DROP TABLE users')).toBeNull()
    expect(asIdentifier('abc')).toBeNull()
    expect(asIdentifier(-1)).toBeNull()
    expect(asIdentifier(0)).toBeNull()
    expect(asIdentifier(1.5)).toBeNull()
    expect(asIdentifier({})).toBeNull()
    expect(asIdentifier(null)).toBeNull()
  })
})
