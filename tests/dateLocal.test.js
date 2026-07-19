import { describe, it, expect } from 'vitest'
import { toIsoDate, parseIsoDate, addDias, hoyConReferencias } from '../server/utils/dateLocal.js'

describe('toIsoDate (server)', () => {
  it('formato YYYY-MM-DD', () => {
    expect(toIsoDate(new Date(2026, 0, 31))).toBe('2026-01-31')
  })
  it('vacío para invalid', () => {
    expect(toIsoDate(null)).toBe('')
  })
})

describe('parseIsoDate (server)', () => {
  it('roundtrip', () => {
    const d = parseIsoDate('2026-01-31')
    expect(toIsoDate(d)).toBe('2026-01-31')
  })
  it('null para formatos no ISO', () => {
    expect(parseIsoDate('31/01/2026')).toBeNull()
  })
})

describe('addDias (server)', () => {
  it('suma y cruza mes', () => {
    expect(addDias('2026-01-31', 1)).toBe('2026-02-01')
    expect(addDias('2026-03-01', -1)).toBe('2026-02-28')
  })
})

describe('hoyConReferencias', () => {
  it('devuelve estructura coherente', () => {
    const r = hoyConReferencias('America/Lima')
    expect(r.fecha).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']).toContain(
      r.diaSemana,
    )
    // referencias siempre tiene 7 entradas únicas (cada día de la semana)
    const dias = Object.keys(r.referencias)
    expect(dias.length).toBe(7)
    for (const f of Object.values(r.referencias)) {
      expect(f).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    }
    expect(r.referenciasTexto).toMatch(/pasado =/)
  })

  it('referenciasTexto usa coma + espacio entre items', () => {
    const r = hoyConReferencias('America/Lima')
    const partes = r.referenciasTexto.split(', ')
    expect(partes.length).toBe(7)
    for (const p of partes) {
      expect(p).toMatch(/ pasado = \d{4}-\d{2}-\d{2}/)
    }
  })
})
