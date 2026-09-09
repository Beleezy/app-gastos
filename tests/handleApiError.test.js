// `handleApiError` decide el texto de CADA error que ve el usuario y no
// tenía ni un test. Además solo se usaba en 5 de los ~29 sitios que
// muestran errores: los otros 24 hacían `e?.data?.message || 'fallback'`,
// que se salta el filtro de mensajes técnicos y los mensajes por status.
// Con eso, un 500 le enseñaba al usuario '[POST] "/api/gastos": 500'.
//
// El parámetro `fallback` existe para poder cablear esos 24 sitios sin
// perder su texto contextual ("No se pudo revocar" es mejor que
// "Ocurrió un error inesperado").

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { handleApiError } from '../utils/handleApiError.js'

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {})
  // Por defecto, con conexión: los tests de red la apagan a propósito.
  vi.stubGlobal('navigator', { onLine: true })
})

describe('handleApiError — mensaje del servidor', () => {
  it('prefiere el detalle de validación Zod, con el campo', () => {
    const err = { data: { data: { issues: [{ path: 'monto', message: 'Debe ser mayor a 0' }] } } }
    expect(handleApiError(err)).toBe('monto: Debe ser mayor a 0')
  })

  it('omite el prefijo cuando el issue es de la raíz', () => {
    const err = { data: { data: { issues: [{ path: '(root)', message: 'Sin cambios' }] } } }
    expect(handleApiError(err)).toBe('Sin cambios')
  })

  it('usa el mensaje del servidor cuando es humano', () => {
    expect(handleApiError({ data: { message: 'La categoría no es tuya' } })).toBe(
      'La categoría no es tuya',
    )
  })
})

describe('handleApiError — no filtra tecnicismos al usuario', () => {
  it.each([
    ['formato ofetch', '[POST] "/api/gastos": 500 Internal Server Error'],
    ['ruta de api', 'Error al llamar /api/deudas'],
    ['statusMessage de Nitro', 'Internal Server Error'],
    ['error de red de bajo nivel', 'NetworkError when attempting to fetch resource'],
    ['vacío', '   '],
  ])('nunca muestra %s', (_caso, message) => {
    const salida = handleApiError({ data: { message } })
    expect(salida).not.toBe(message)
    expect(salida).not.toContain('/api/')
  })
})

describe('handleApiError — mensajes por status', () => {
  it.each([
    [401, /sesión expiró/i],
    [403, /permiso/i],
    [404, /no encontramos/i],
    [409, /modificó estos datos/i],
    [429, /demasiados intentos/i],
    [500, /no se pudo guardar/i],
    [503, /no se pudo guardar/i],
  ])('status %i da un mensaje humano', (statusCode, patron) => {
    expect(handleApiError({ statusCode })).toMatch(patron)
  })

  it('sin conexión gana sobre el status', () => {
    vi.stubGlobal('navigator', { onLine: false })
    expect(handleApiError({ statusCode: 500 })).toMatch(/sin conexión/i)
  })
})

describe('handleApiError — fallback contextual', () => {
  it('usa el fallback en vez del genérico cuando no hay nada útil', () => {
    expect(handleApiError({}, 'No se pudo revocar')).toBe('No se pudo revocar')
  })

  it('el fallback también sustituye al genérico ante un mensaje técnico', () => {
    const err = { data: { message: '[DELETE] "/api/x": 500' } }
    expect(handleApiError(err, 'No se pudo eliminar')).toBe('No se pudo eliminar')
  })

  it('el mensaje del servidor gana sobre el fallback: es más específico', () => {
    const err = { data: { message: 'Esta deuda ya está saldada' } }
    expect(handleApiError(err, 'No se pudo pagar')).toBe('Esta deuda ya está saldada')
  })

  it('el detalle Zod gana sobre el fallback', () => {
    const err = { data: { data: { issues: [{ path: 'monto', message: 'Obligatorio' }] } } }
    expect(handleApiError(err, 'No se pudo guardar')).toBe('monto: Obligatorio')
  })

  it('un status conocido gana sobre el fallback: dice qué pasó, no qué falló', () => {
    expect(handleApiError({ statusCode: 401 }, 'No se pudo revocar')).toMatch(/sesión expiró/i)
  })

  it('sin fallback sigue dando el genérico de siempre', () => {
    expect(handleApiError({})).toBe('Ocurrió un error inesperado. Intenta de nuevo.')
  })

  it('un fallback vacío no deja al usuario sin mensaje', () => {
    expect(handleApiError({}, '')).toBe('Ocurrió un error inesperado. Intenta de nuevo.')
  })
})

describe('handleApiError — entradas degeneradas', () => {
  it.each([[null], [undefined], ['un string suelto'], [42]])('no revienta con %p', (err) => {
    expect(typeof handleApiError(err)).toBe('string')
    expect(handleApiError(err).length).toBeGreaterThan(0)
  })
})
