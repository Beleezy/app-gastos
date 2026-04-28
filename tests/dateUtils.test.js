import { describe, it, expect } from 'vitest'
import {
  toIsoDate,
  parseIsoDate,
  addDias,
  diasEntre,
  inicioFinMes,
  nombreMes,
  ultimosNDias,
} from '../composables/useDateUtils.js'

describe('toIsoDate', () => {
  it('formato YYYY-MM-DD', () => {
    expect(toIsoDate(new Date(2026, 3, 5))).toBe('2026-04-05')
  })
  it('vacio para input invalido', () => {
    expect(toIsoDate(null)).toBe('')
    expect(toIsoDate('not a date')).toBe('')
  })
})

describe('parseIsoDate', () => {
  it('roundtrip con toIsoDate', () => {
    const d = parseIsoDate('2026-04-05')
    expect(toIsoDate(d)).toBe('2026-04-05')
  })
  it('null si formato incorrecto', () => {
    expect(parseIsoDate('05/04/2026')).toBeNull()
    expect(parseIsoDate(null)).toBeNull()
  })
})

describe('addDias', () => {
  it('suma y resta dias', () => {
    expect(addDias('2026-04-05', 3)).toBe('2026-04-08')
    expect(addDias('2026-04-05', -5)).toBe('2026-03-31')
  })
  it('cruza fin de mes', () => {
    expect(addDias('2026-01-31', 1)).toBe('2026-02-01')
  })
})

describe('diasEntre', () => {
  it('positivo si B > A', () => {
    expect(diasEntre('2026-04-01', '2026-04-10')).toBe(9)
  })
  it('negativo si B < A', () => {
    expect(diasEntre('2026-04-10', '2026-04-01')).toBe(-9)
  })
})

describe('inicioFinMes', () => {
  it('rango correcto con febrero bisiesto', () => {
    expect(inicioFinMes(2024, 2)).toEqual({ desde: '2024-02-01', hasta: '2024-02-29', dias: 29 })
    expect(inicioFinMes(2026, 2)).toEqual({ desde: '2026-02-01', hasta: '2026-02-28', dias: 28 })
  })
})

describe('nombreMes', () => {
  it('localiza nombres', () => {
    expect(nombreMes(1)).toBe('enero')
    expect(nombreMes(12)).toBe('diciembre')
    expect(nombreMes(0)).toBe('')
    expect(nombreMes(13)).toBe('')
  })
})

describe('ultimosNDias', () => {
  it('devuelve rango razonable', () => {
    const r = ultimosNDias(7)
    expect(r.desde).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(r.hasta).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(diasEntre(r.desde, r.hasta)).toBe(7)
  })
})
