// `useFormatters` da formato a TODAS las fechas y horas que ve el usuario
// y no tenía ni un test. Se descubrió al partir `DetallePersona.vue`, que
// llevaba su propia copia de `formatFecha` —byte a byte el mismo
// resultado, con el array de meses duplicado inline— y por tanto no
// dependía de esta.

import { describe, it, expect } from 'vitest'
import { useFormatters } from '../composables/useFormatters.js'

const { formatFecha, formatFechaCorta, formatFechaDia, formatHora, formatMesAnio } = useFormatters()

describe('formatFecha', () => {
  it('devuelve día, mes en minúscula y año', () => {
    expect(formatFecha('2026-01-15')).toBe('15 de enero, 2026')
    expect(formatFecha('2026-12-01')).toBe('1 de diciembre, 2026')
  })

  it('interpreta la fecha en local, no en UTC', () => {
    // El `T00:00:00` del constructor no es decorativo: sin él,
    // `new Date('2026-01-01')` se interpreta como UTC y en América cae al
    // 31 de diciembre del año anterior.
    expect(formatFecha('2026-01-01')).toBe('1 de enero, 2026')
  })

  it('una fecha vacía no imprime "Invalid Date"', () => {
    expect(formatFecha('')).toBe('')
    expect(formatFecha(null)).toBe('')
    expect(formatFecha(undefined)).toBe('')
  })
})

describe('formatFechaCorta', () => {
  it('usa el formato numérico con ceros', () => {
    expect(formatFechaCorta('2026-01-05')).toMatch(/05/)
    expect(formatFechaCorta('2026-01-05')).toMatch(/2026/)
  })

  it('vacía no rompe', () => {
    expect(formatFechaCorta('')).toBe('')
  })
})

describe('formatFechaDia', () => {
  it('devuelve una cadena no vacía para una fecha válida', () => {
    expect(formatFechaDia('2026-06-15')).toBeTruthy()
  })

  it('vacía no rompe', () => {
    expect(formatFechaDia('')).toBe('')
  })
})

describe('formatHora', () => {
  it.each([
    ['09:30', '9:30 am'],
    ['00:05', '12:05 am'],
    ['12:00', '12:00 pm'],
    ['13:07', '1:07 pm'],
    ['23:59', '11:59 pm'],
  ])('convierte %s a 12 horas → %s', (entrada, esperado) => {
    expect(formatHora(entrada)).toBe(esperado)
  })

  it('medianoche es 12 am y mediodía 12 pm, no "0:00"', () => {
    // `hh % 12 || 12` es lo que evita el "0:00 am".
    expect(formatHora('00:00')).toBe('12:00 am')
    expect(formatHora('12:30')).toBe('12:30 pm')
  })

  it('rellena los minutos a dos dígitos', () => {
    expect(formatHora('08:05')).toBe('8:05 am')
  })

  it('vacía no rompe', () => {
    expect(formatHora('')).toBe('')
    expect(formatHora(null)).toBe('')
  })
})

describe('formatMesAnio', () => {
  it('nombra el mes', () => {
    expect(formatMesAnio(1, 2026).toLowerCase()).toContain('ener')
    expect(formatMesAnio(12, 2026).toLowerCase()).toContain('dic')
  })

  it('incluye el año', () => {
    expect(formatMesAnio(6, 2026)).toContain('2026')
  })
})
