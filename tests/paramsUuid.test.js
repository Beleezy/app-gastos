// Todos los ids de esta base son `uuid` en Postgres. Cuando un endpoint
// pasa el param de ruta crudo a `eq(tabla.id, id)`, un id que no es UUID
// no produce "no encontrado": produce un error del driver
// (`invalid input syntax for type uuid`) que Nitro devuelve como 500,
// filtrando el mensaje del driver al cliente.
//
// CLAUDE.md ya documenta esta lección para el módulo Compartido —
// "Ids desde la URL: validar antes de consultar" — pero la regla vivía
// dentro de `server/utils/compartido.js` y no se generalizó: los 47
// endpoints con `[id]` de los demás módulos pasaban el param sin mirar.
//
// `getUuidParam` es esa misma regla, extraída para que cualquier handler
// la use. Devuelve 404 y no 400 a propósito, igual que `assertOwner`: un
// id que no puede existir es indistinguible de uno que no existe, y así
// no se filtra cuál de las dos cosas es.

import { describe, it, expect, vi, beforeEach } from 'vitest'

const { estado } = vi.hoisted(() => ({ estado: { params: {} } }))

vi.stubGlobal('getRouterParam', (_event, nombre) => estado.params[nombre])
vi.stubGlobal('createError', (opts) => {
  const err = new Error(opts.message)
  err.statusCode = opts.statusCode
  return err
})

const { esUuid, getUuidParam } = await import('../server/utils/params.js')

const VALIDO = '550e8400-e29b-41d4-a716-446655440000'

beforeEach(() => {
  estado.params = {}
})

describe('esUuid', () => {
  it('acepta un UUID canónico', () => {
    expect(esUuid(VALIDO)).toBe(true)
  })

  it('acepta mayúsculas', () => {
    expect(esUuid(VALIDO.toUpperCase())).toBe(true)
  })

  it.each([
    ['cadena arbitraria', 'no-soy-un-uuid'],
    ['vacío', ''],
    ['sin guiones', '550e8400e29b41d4a716446655440000'],
    ['un guion de menos', '550e8400-e29b-41d4-a716446655440000'],
    ['con sufijo', VALIDO + 'x'],
    ['con espacio delante', ' ' + VALIDO],
    ['inyección SQL', "' OR 1=1--"],
    ['número', 42],
    ['null', null],
    ['undefined', undefined],
  ])('rechaza %s', (_caso, valor) => {
    expect(esUuid(valor)).toBe(false)
  })
})

describe('getUuidParam', () => {
  it('devuelve el id cuando es un UUID', () => {
    estado.params.id = VALIDO
    expect(getUuidParam({}, 'id')).toBe(VALIDO)
  })

  it('lanza 404 —no 500— cuando el id no es un UUID', () => {
    estado.params.id = 'no-soy-un-uuid'
    expect(() => getUuidParam({}, 'id')).toThrow(expect.objectContaining({ statusCode: 404 }))
  })

  it('lanza 404 cuando el param falta', () => {
    expect(() => getUuidParam({}, 'id')).toThrow(expect.objectContaining({ statusCode: 404 }))
  })

  it('lee el nombre de param indicado, no siempre "id"', () => {
    estado.params.pagoId = VALIDO
    expect(getUuidParam({}, 'pagoId')).toBe(VALIDO)
  })

  it('nombra el recurso en el mensaje', () => {
    estado.params.id = 'x'
    expect(() => getUuidParam({}, 'id', { recurso: 'Gasto' })).toThrow(/Gasto no encontrado/)
  })

  it.each([
    ['Deuda', 'Deuda no encontrada'],
    ['Persona', 'Persona no encontrada'],
    // Femeninos que no acaban en 'a': el caso que rompe cualquier
    // heurístico por terminación.
    ['Conexión', 'Conexión no encontrada'],
    ['Solicitud', 'Solicitud no encontrada'],
    ['Categoría', 'Categoría no encontrada'],
    ['Gasto', 'Gasto no encontrado'],
    ['Ingreso', 'Ingreso no encontrado'],
    ['Pago', 'Pago no encontrado'],
  ])('concuerda el género para %s', (recurso, esperado) => {
    estado.params.id = 'x'
    expect(() => getUuidParam({}, 'id', { recurso })).toThrow(esperado)
  })

  it('el mensaje por defecto no revela el id recibido', () => {
    estado.params.id = "' OR 1=1--"
    let capturado
    try {
      getUuidParam({}, 'id')
    } catch (e) {
      capturado = e
    }
    expect(capturado.message).not.toContain('OR 1=1')
  })
})
