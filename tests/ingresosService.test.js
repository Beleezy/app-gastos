// Regresión de `actualizarIngreso`: la función llamaba a `assertOwner` con la
// firma equivocada (la tabla Drizzle en vez de la fila cargada), lo que lanzaba
// 404 antes de llegar al UPDATE — editar un ingreso estaba roto siempre.
//
// Aquí se mockea la capa `db` para verificar, sin Postgres, que el UPDATE se
// ejecuta, que filtra por id + usuarioId + deleted_at, y que el 404 solo sale
// cuando no hay fila que coincida. La verificación contra la DB real vive en
// e2e/api/ingresos.api.spec.js.

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { PgDialect } from 'drizzle-orm/pg-core'

const { estado } = vi.hoisted(() => ({
  estado: { filas: [], llamadas: [], where: null },
}))

vi.mock('../server/utils/db.js', () => {
  const chain = {
    set(values) {
      estado.llamadas.push('set')
      estado.set = values
      return chain
    },
    where(cond) {
      estado.llamadas.push('where')
      estado.where = cond
      return chain
    },
    returning() {
      estado.llamadas.push('returning')
      return Promise.resolve(estado.filas)
    },
  }
  return {
    db: {
      update(tabla) {
        estado.llamadas.push('update')
        estado.tabla = tabla
        return chain
      },
    },
  }
})

const { actualizarIngreso } = await import('../server/services/ingresos.service.js')

const dialect = new PgDialect()
const whereQuery = () => dialect.sqlToQuery(estado.where)

const FILA = {
  id: 'ing-1',
  usuarioId: 'u1',
  concepto: 'Sueldo',
  monto: '1500.00',
  fecha: '2026-04-28',
  origen: 'salario',
}

beforeEach(() => {
  estado.filas = []
  estado.llamadas = []
  estado.where = null
  estado.set = null
  estado.tabla = null
})

describe('actualizarIngreso', () => {
  it('ejecuta el UPDATE y devuelve la fila con el monto parseado', async () => {
    estado.filas = [FILA]

    const r = await actualizarIngreso({
      id: 'ing-1',
      usuarioId: 'u1',
      body: { concepto: '  Sueldo  ', monto: 1500 },
    })

    expect(estado.llamadas).toEqual(['update', 'set', 'where', 'returning'])
    expect(r.monto).toBe(1500)
    expect(typeof r.monto).toBe('number')
    expect(r.id).toBe('ing-1')
  })

  it('mapea solo los campos presentes en el body y toca updatedAt', async () => {
    estado.filas = [FILA]

    await actualizarIngreso({ id: 'ing-1', usuarioId: 'u1', body: { concepto: '  Sueldo  ' } })

    expect(estado.set.concepto).toBe('Sueldo')
    expect(estado.set.updatedAt).toBeInstanceOf(Date)
    expect(estado.set).not.toHaveProperty('monto')
    expect(estado.set).not.toHaveProperty('fecha')
  })

  it('filtra por id, usuarioId y deleted_at (protección IDOR)', async () => {
    estado.filas = [FILA]

    await actualizarIngreso({ id: 'ing-1', usuarioId: 'u1', body: { concepto: 'X' } })

    const { sql, params } = whereQuery()
    expect(sql).toContain('"id"')
    expect(sql).toContain('"usuario_id"')
    expect(sql).toContain('"deleted_at" is null')
    expect(params).toEqual(['ing-1', 'u1'])
  })

  it('lanza 404 cuando el UPDATE no encuentra fila (ajena, inexistente o borrada)', async () => {
    estado.filas = []

    await expect(
      actualizarIngreso({ id: 'ajeno', usuarioId: 'u1', body: { concepto: 'X' } }),
    ).rejects.toMatchObject({ statusCode: 404, message: 'Ingreso no encontrado' })

    // El 404 llega DESPUÉS del UPDATE, no antes de intentarlo.
    expect(estado.llamadas).toEqual(['update', 'set', 'where', 'returning'])
  })
})
