import { describe, it, expect } from 'vitest'
import { hashInput } from '../server/utils/llmCache.js'

describe('hashInput', () => {
  it('produce el mismo hash para entradas idénticas', () => {
    const a = hashInput({ texto: 'gasté 10 soles en café' })
    const b = hashInput({ texto: 'gasté 10 soles en café' })
    expect(a).toBe(b)
    expect(a).toHaveLength(64)
  })

  it('normaliza mayúsculas, espacios y diacríticos NFKC', () => {
    const a = hashInput({ texto: 'Café  10 SOLES' })
    const b = hashInput({ texto: 'café 10 soles' })
    expect(a).toBe(b)
  })

  it('cambia el hash cuando cambia el texto', () => {
    const a = hashInput({ texto: '10 soles café' })
    const b = hashInput({ texto: '20 soles café' })
    expect(a).not.toBe(b)
  })

  it('cambia el hash cuando cambia el extra (modo, fecha, categorías)', () => {
    const a = hashInput({ texto: 'café', extra: 'gastos|2026-05-19|cat:a,b' })
    const b = hashInput({ texto: 'café', extra: 'gastos|2026-05-20|cat:a,b' })
    expect(a).not.toBe(b)
  })

  it('maneja valores nulos sin reventar', () => {
    expect(() => hashInput()).not.toThrow()
    expect(() => hashInput({ texto: null })).not.toThrow()
    expect(() => hashInput({ texto: undefined, extra: undefined })).not.toThrow()
  })
})
