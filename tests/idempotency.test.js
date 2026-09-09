// Idempotencia de mutaciones reintentadas desde la cola offline.
//
// El store vivía en un Map del proceso. El propio archivo reconocía el
// agujero: "en despliegues multi-instancia un retry puede llegar a otra
// instancia y no encontrar el slot → la operación se aplica dos veces".
// En Vercel eso es el caso normal, y el consumidor es la cola offline,
// que reintenta justo cuando vuelve la red. El síntoma es el peor posible
// para una app de finanzas: gastos duplicados que el usuario no registró.
//
// Ahora la reserva es una fila con índice único (usuario, método, path,
// clave) en Postgres: dos peticiones concurrentes compiten por insertar y
// solo una gana. Estos tests usan una BD falsa que simula ese índice.

import { describe, it, expect, beforeEach, vi } from 'vitest'

const { estado } = vi.hoisted(() => ({ estado: { filas: [], fallarInsert: false } }))

// BD falsa: un array de filas + la restricción única aplicada a mano.
vi.mock('../server/utils/db.js', () => {
  const clave = (f) => `${f.usuarioId}|${f.metodo}|${f.path}|${f.clave}`

  const db = {
    insert() {
      return {
        values(v) {
          return {
            onConflictDoNothing() {
              return {
                returning() {
                  if (estado.fallarInsert) return Promise.reject(new Error('db caída'))
                  const existe = estado.filas.some((f) => clave(f) === clave(v))
                  if (existe) return Promise.resolve([]) // el índice único lo rechaza
                  const fila = { id: `row-${estado.filas.length}`, ...v }
                  estado.filas.push(fila)
                  return Promise.resolve([fila])
                },
              }
            },
          }
        },
      }
    },
    select() {
      return {
        from() {
          return {
            where(pred) {
              return {
                limit() {
                  return Promise.resolve(estado.filas.filter(pred._match))
                },
              }
            },
          }
        },
      }
    },
    update() {
      return {
        set(v) {
          return {
            where(pred) {
              const encontradas = estado.filas.filter(pred._match)
              for (const f of encontradas) Object.assign(f, v)
              return Promise.resolve(encontradas)
            },
          }
        },
      }
    },
    delete() {
      return {
        where(pred) {
          estado.filas = estado.filas.filter((f) => !pred._match(f))
          return Promise.resolve()
        },
      }
    },
  }
  return { db }
})

vi.mock('../server/database/schema.js', () => ({
  idempotencyKeys: {
    usuarioId: 'usuarioId',
    metodo: 'metodo',
    path: 'path',
    clave: 'clave',
  },
}))

// Los operadores de Drizzle se sustituyen por predicados evaluables sobre
// las filas falsas.
vi.mock('drizzle-orm', () => ({
  eq: (col, val) => {
    const p = (f) => f[col] === val
    return { _match: p }
  },
  and: (...conds) => {
    const p = (f) => conds.every((c) => c._match(f))
    return { _match: p }
  },
  lt: (col, val) => ({ _match: (f) => f[col] < val }),
}))

const { conIdempotencia } = await import('../server/utils/idempotency.js')

beforeEach(() => {
  estado.filas = []
  estado.fallarInsert = false
  globalThis.getRequestHeader = vi.fn((event, name) => event.headers?.[name.toLowerCase()])
  globalThis.setResponseHeader = vi.fn()
  globalThis.createError = vi.fn((opts) => {
    const err = new Error(opts.message)
    err.statusCode = opts.statusCode
    return err
  })
})

const evt = (headers = {}, over = {}) => ({
  method: 'POST',
  path: '/api/gastos/bulk',
  headers,
  ...over,
})

describe('conIdempotencia', () => {
  it('sin header Idempotency-Key ejecuta el handler tal cual', async () => {
    const handler = vi.fn(async () => ({ ok: true }))
    const r = await conIdempotencia(evt(), 'u1', handler)
    expect(r).toEqual({ ok: true })
    expect(handler).toHaveBeenCalledTimes(1)
    // Sin clave no hay nada que reservar.
    expect(estado.filas).toHaveLength(0)
  })

  it('primera petición con clave ejecuta el handler y guarda la respuesta', async () => {
    const handler = vi.fn(async () => ({ id: 42 }))
    const r = await conIdempotencia(evt({ 'idempotency-key': 'k1' }), 'u1', handler)
    expect(r).toEqual({ id: 42 })
    expect(handler).toHaveBeenCalledTimes(1)
    expect(estado.filas).toHaveLength(1)
    expect(JSON.parse(estado.filas[0].responseJson)).toEqual({ id: 42 })
  })

  it('el reintento NO re-ejecuta el handler y devuelve la respuesta original', async () => {
    const handler = vi.fn(async () => ({ id: 42 }))
    await conIdempotencia(evt({ 'idempotency-key': 'k1' }), 'u1', handler)

    const handler2 = vi.fn(async () => ({ id: 99 }))
    const r = await conIdempotencia(evt({ 'idempotency-key': 'k1' }), 'u1', handler2)

    expect(handler2).not.toHaveBeenCalled()
    expect(r).toEqual({ id: 42 })
  })

  it('marca el reintento con X-Idempotent-Replay', async () => {
    await conIdempotencia(evt({ 'idempotency-key': 'k1' }), 'u1', async () => ({ ok: 1 }))
    const e2 = evt({ 'idempotency-key': 'k1' })
    await conIdempotencia(e2, 'u1', async () => ({ ok: 2 }))
    expect(globalThis.setResponseHeader).toHaveBeenCalledWith(e2, 'X-Idempotent-Replay', 'true')
  })

  it('aísla por usuario: la misma clave de otro usuario no lee la respuesta ajena', async () => {
    await conIdempotencia(evt({ 'idempotency-key': 'k1' }), 'u1', async () => ({ de: 'u1' }))
    const r = await conIdempotencia(evt({ 'idempotency-key': 'k1' }), 'u2', async () => ({
      de: 'u2',
    }))
    expect(r).toEqual({ de: 'u2' })
  })

  it('aísla por método y por path', async () => {
    await conIdempotencia(evt({ 'idempotency-key': 'k1' }), 'u1', async () => ({ v: 'post' }))

    const otroMetodo = evt({ 'idempotency-key': 'k1' }, { method: 'DELETE' })
    expect(await conIdempotencia(otroMetodo, 'u1', async () => ({ v: 'del' }))).toEqual({
      v: 'del',
    })

    const otroPath = evt({ 'idempotency-key': 'k1' }, { path: '/api/otro' })
    expect(await conIdempotencia(otroPath, 'u1', async () => ({ v: 'otro' }))).toEqual({
      v: 'otro',
    })
  })

  it('si el handler falla, LIBERA la reserva para que el reintento funcione', async () => {
    // Sin esto, un fallo transitorio dejaría la clave reservada y para
    // siempre sin respuesta: el reintento legítimo chocaría con su propia
    // reserva huérfana en vez de volver a intentarlo.
    const e = evt({ 'idempotency-key': 'k1' })
    await expect(
      conIdempotencia(e, 'u1', async () => {
        throw new Error('fallo transitorio')
      }),
    ).rejects.toThrow('fallo transitorio')

    expect(estado.filas).toHaveLength(0)

    const r = await conIdempotencia(evt({ 'idempotency-key': 'k1' }), 'u1', async () => ({ ok: 1 }))
    expect(r).toEqual({ ok: 1 })
  })

  it('un reintento mientras la original sigue en vuelo responde 409, no duplica', async () => {
    // Simula la carrera: la reserva existe pero aún sin respuesta.
    estado.filas.push({
      usuarioId: 'u1',
      metodo: 'POST',
      path: '/api/gastos/bulk',
      clave: 'k1',
      responseJson: null,
      expiresAt: new Date(Date.now() + 60000),
    })

    const handler = vi.fn(async () => ({ id: 1 }))
    await expect(
      conIdempotencia(evt({ 'idempotency-key': 'k1' }), 'u1', handler),
    ).rejects.toMatchObject({ statusCode: 409 })
    expect(handler).not.toHaveBeenCalled()
  })

  it('si la BD falla al reservar, la operación sigue adelante', async () => {
    // La idempotencia es una red de seguridad, no una dependencia dura:
    // que la tabla no esté disponible no debe impedir registrar un gasto.
    estado.fallarInsert = true
    const handler = vi.fn(async () => ({ ok: true }))
    const r = await conIdempotencia(evt({ 'idempotency-key': 'k1' }), 'u1', handler)
    expect(r).toEqual({ ok: true })
    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('ignora una clave vacía o demasiado larga en vez de romper', async () => {
    const handler = vi.fn(async () => ({ ok: true }))
    await conIdempotencia(evt({ 'idempotency-key': '' }), 'u1', handler)
    await conIdempotencia(evt({ 'idempotency-key': 'x'.repeat(500) }), 'u1', handler)
    expect(handler).toHaveBeenCalledTimes(2)
    expect(estado.filas).toHaveLength(0)
  })
})
