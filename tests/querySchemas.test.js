// Schemas de los query params de los listados.
//
// Estos parámetros iban CRUDOS del query string a la consulta: `fecha` y
// `mes`/`anio` a rangos contra columnas date, `categoriaId` y `personaId` a
// `eq()` contra columnas uuid, `estado` y `tipo` contra columnas enum de
// Postgres. Once combinaciones distintas devolvían un 500 con la consulta y
// sus parámetros en el mensaje, en los dos endpoints de LECTURA más
// golpeados de la app: `/api/gastos` carga el historial en cada visita a
// /registro. Basta una URL vieja guardada en favoritos.
//
// `validateQuery` existía en `utils/validate.js` y lo usaba UN endpoint.

import { describe, it, expect } from 'vitest'
import { gastosListQuerySchema } from '../shared/schemas/gastos.js'
import { deudasListQuerySchema } from '../shared/schemas/deudas.js'
import { mesAnioQuerySchema } from '../shared/schemas/common.js'

const UUID = '3f51518f-b0ef-4c4f-a0f0-b3a7c3caa01c'
const ok = (schema, q) => schema.safeParse(q).success

describe('gastosListQuerySchema', () => {
  it('acepta lo que manda el cliente', () => {
    expect(ok(gastosListQuerySchema, {})).toBe(true)
    expect(ok(gastosListQuerySchema, { fecha: '2026-09-10' })).toBe(true)
    expect(ok(gastosListQuerySchema, { mes: '9', anio: '2026' })).toBe(true)
    expect(ok(gastosListQuerySchema, { mes: '9', anio: '2026', _v: '17' })).toBe(true)
  })

  it('coerciona mes y anio a número: llegan como string', () => {
    const d = gastosListQuerySchema.parse({ mes: '9', anio: '2026' })
    expect(d.mes).toBe(9)
    expect(d.anio).toBe(2026)
  })

  it('trata el string vacío como ausente', () => {
    // El cliente manda `?fecha=` cuando el filtro no está puesto. Un ''
    // entraba como valor y acababa en un eq() contra una columna date.
    const d = gastosListQuerySchema.parse({ fecha: '', categoriaId: '', busqueda: '' })
    expect(d.fecha).toBeUndefined()
    expect(d.categoriaId).toBeUndefined()
  })

  it('rechaza fechas que no son YYYY-MM-DD', () => {
    expect(ok(gastosListQuerySchema, { fecha: 'no-es-fecha' })).toBe(false)
    expect(ok(gastosListQuerySchema, { fechaDesde: 'x', fechaHasta: 'y' })).toBe(false)
  })

  it('rechaza un categoriaId que no es uuid', () => {
    expect(ok(gastosListQuerySchema, { categoriaId: 'abc-123' })).toBe(false)
    expect(ok(gastosListQuerySchema, { categoriaId: UUID })).toBe(true)
  })

  it('rechaza meses imposibles, no solo los no numéricos', () => {
    // `parseInt(x) || default` ya acotaba "abc", pero dejaba pasar un
    // `?mes=99&anio=1`, que arma el rango "0001-99-01" y revienta la query.
    expect(ok(gastosListQuerySchema, { mes: 'abc' })).toBe(false)
    expect(ok(gastosListQuerySchema, { mes: '99' })).toBe(false)
    expect(ok(gastosListQuerySchema, { mes: '0' })).toBe(false)
    expect(ok(gastosListQuerySchema, { anio: '1' })).toBe(false)
  })

  it('rechaza paginaciones negativas o desmedidas', () => {
    expect(ok(gastosListQuerySchema, { limit: '-1' })).toBe(false)
    expect(ok(gastosListQuerySchema, { offset: '-5' })).toBe(false)
    expect(ok(gastosListQuerySchema, { limit: '99999999' })).toBe(false)
  })

  it('rechaza un orden desconocido en vez de ignorarlo', () => {
    expect(ok(gastosListQuerySchema, { orden: 'basura' })).toBe(false)
    expect(ok(gastosListQuerySchema, { orden: 'monto_desc' })).toBe(true)
  })

  it('deja pasar los cache busters que manda el cliente', () => {
    // `_v` y `_t` no los lee ningún handler, pero llegan en cada petición.
    expect(ok(gastosListQuerySchema, { _v: '9', _t: '12345', fresh: '1' })).toBe(true)
  })
})

describe('deudasListQuerySchema', () => {
  it('acepta lo que manda useDeudas', () => {
    expect(ok(deudasListQuerySchema, { personaId: UUID, tipo: 'me_deben' })).toBe(true)
    expect(ok(deudasListQuerySchema, { tipo: 'yo_debo', _t: '1' })).toBe(true)
    expect(ok(deudasListQuerySchema, {})).toBe(true)
  })

  it('rechaza un personaId que no es uuid', () => {
    expect(ok(deudasListQuerySchema, { personaId: 'abc' })).toBe(false)
  })

  it('rechaza estados y tipos fuera del enum de la columna', () => {
    expect(ok(deudasListQuerySchema, { estado: 'basura' })).toBe(false)
    expect(ok(deudasListQuerySchema, { tipo: 'inventado' })).toBe(false)
    expect(ok(deudasListQuerySchema, { estado: 'parcial' })).toBe(true)
  })
})

describe('mesAnioQuerySchema', () => {
  it('acota el mes a 1-12 y el año a un rango razonable', () => {
    expect(ok(mesAnioQuerySchema, { mes: '99', anio: '1' })).toBe(false)
    expect(ok(mesAnioQuerySchema, { mes: '12', anio: '2026' })).toBe(true)
  })

  it('sin parámetros es válido: el handler cae a su default', () => {
    expect(ok(mesAnioQuerySchema, {})).toBe(true)
  })
})
