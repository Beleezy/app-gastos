import { describe, it, expect } from 'vitest'
import { getSymbol, formatMonto, parseMonto, formatCompact } from '../utils/currencyFormat.js'

describe('getSymbol', () => {
  it('devuelve símbolo para monedas conocidas', () => {
    expect(getSymbol('PEN')).toBe('S/')
    expect(getSymbol('USD')).toBe('$')
    expect(getSymbol('EUR')).toBe('€')
  })
  it('devuelve el código si es desconocida', () => {
    expect(getSymbol('XYZ')).toBe('XYZ')
  })
})

describe('formatMonto', () => {
  it('formato base con miles y 2 decimales', () => {
    expect(formatMonto(1234.5)).toBe('S/ 1,234.50')
    expect(formatMonto(0)).toBe('S/ 0.00')
  })
  it('negativos llevan signo menos', () => {
    expect(formatMonto(-100)).toBe('-S/ 100.00')
  })
  it('con opt signo=true muestra + en positivos', () => {
    expect(formatMonto(50, { signo: true })).toBe('+S/ 50.00')
    expect(formatMonto(-50, { signo: true })).toBe('-S/ 50.00')
  })
  it('separadores configurables (es-PE con coma decimal)', () => {
    expect(formatMonto(1234.5, { separadorMiles: '.', separadorDecimales: ',' })).toBe('S/ 1.234,50')
  })
  it('moneda alternativa', () => {
    expect(formatMonto(99, { moneda: 'USD' })).toBe('$ 99.00')
  })
  it('input inválido devuelve 0', () => {
    expect(formatMonto('abc')).toBe('S/ 0.00')
  })
})

describe('parseMonto', () => {
  it('formato es-US (coma miles, punto decimal)', () => {
    expect(parseMonto('S/ 1,234.50')).toBe(1234.5)
  })
  it('formato es-PE (punto miles, coma decimal)', () => {
    expect(parseMonto('S/ 1.234,50')).toBe(1234.5)
  })
  it('coma como decimal sin miles', () => {
    expect(parseMonto('99,50')).toBe(99.5)
  })
  it('punto como miles solo', () => {
    expect(parseMonto('S/ 1.234')).toBe(1234)
  })
  it('número plano', () => {
    expect(parseMonto('100')).toBe(100)
  })
  it('vacío → NaN', () => {
    expect(Number.isNaN(parseMonto(''))).toBe(true)
  })
})

describe('formatCompact', () => {
  it('millones', () => {
    expect(formatCompact(2_500_000)).toBe('S/ 2.5M')
    expect(formatCompact(1_000_000)).toBe('S/ 1M')
  })
  it('miles', () => {
    expect(formatCompact(1500)).toBe('S/ 1.5K')
    expect(formatCompact(1000)).toBe('S/ 1K')
  })
  it('chico se muestra completo', () => {
    expect(formatCompact(99.5)).toBe('S/ 99.50')
    expect(formatCompact(50)).toBe('S/ 50')
  })
  it('negativo', () => {
    expect(formatCompact(-1500)).toBe('-S/ 1.5K')
  })
})
