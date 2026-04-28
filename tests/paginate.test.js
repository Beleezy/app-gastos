import { describe, it, expect } from 'vitest'
import {
  parsePaginacionQuery,
  paginarResultado,
  encodeCursor,
  decodeCursor,
} from '../server/utils/paginate.js'

describe('parsePaginacionQuery', () => {
  it('aplica defaults', () => {
    const r = parsePaginacionQuery({})
    expect(r.limit).toBe(50)
    expect(r.cursor).toBeNull()
  })

  it('clamp con maxLimit', () => {
    expect(parsePaginacionQuery({ limit: '500' }, { maxLimit: 100 }).limit).toBe(100)
  })

  it('rechaza limit inválido', () => {
    expect(parsePaginacionQuery({ limit: '-5' }).limit).toBe(50)
    expect(parsePaginacionQuery({ limit: 'abc' }).limit).toBe(50)
  })

  it('toma cursor del query', () => {
    expect(parsePaginacionQuery({ cursor: 'abc' }).cursor).toBe('abc')
    expect(parsePaginacionQuery({ cursor: '   ' }).cursor).toBeNull()
  })
})

describe('paginarResultado', () => {
  it('hasMore=true cuando hay limit+1 items', () => {
    const filas = [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }]
    const r = paginarResultado(filas, 3, (x) => String(x.id))
    expect(r.items).toHaveLength(3)
    expect(r.hasMore).toBe(true)
    expect(r.nextCursor).toBe('3')
  })

  it('hasMore=false cuando hay menos', () => {
    const filas = [{ id: 1 }, { id: 2 }]
    const r = paginarResultado(filas, 5, (x) => String(x.id))
    expect(r.items).toHaveLength(2)
    expect(r.hasMore).toBe(false)
    expect(r.nextCursor).toBeNull()
  })
})

describe('encode/decodeCursor', () => {
  it('roundtrip preserva contenido', () => {
    const data = ['2026-04-01', 'abcd-1234', 99]
    const encoded = encodeCursor(data)
    expect(typeof encoded).toBe('string')
    expect(decodeCursor(encoded)).toEqual(data)
  })

  it('decode retorna null si inválido', () => {
    expect(decodeCursor('!!!@@@')).toBeNull()
    expect(decodeCursor(null)).toBeNull()
  })
})
