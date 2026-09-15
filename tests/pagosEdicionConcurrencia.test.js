// Regresión del lost update al EDITAR y REVERTIR pagos.
//
// El PR #100 cerró el agujero en `registrarPago`; los dos handlers vecinos
// —PUT y DELETE de /api/deudas/pagos/[pagoId]— seguían con la misma
// estructura: leían la deuda y la suma de pagos FUERA de la transacción,
// calculaban el pendiente en JS y escribían ese valor absoluto. Dos
// reversiones concurrentes partían del mismo pendiente y la segunda
// pisaba a la primera; el PUT además hacía tres consultas cuyo resultado
// no usaba nadie.
//
// Como en pagosConcurrencia.test.js, lo que se fija es estructural (no hay
// Postgres real aquí): la deuda se lee DENTRO de la transacción y con
// `FOR UPDATE`, la suma de pagos se calcula dentro, y todo UPDATE ocurre
// dentro.

import { describe, it, expect, vi, beforeEach } from 'vitest'

const { estado } = vi.hoisted(() => ({
  estado: { pago: null, deuda: null, totalPagado: '0', selects: [], updates: [] },
}))

function selectChain(dentroDeTx, proyeccion) {
  const registro = { dentroDeTx, locked: false, agregado: !!proyeccion?.total }
  estado.selects.push(registro)
  const chain = {
    from(tabla) {
      registro.tabla = tabla
      return chain
    },
    innerJoin() {
      registro.join = true
      return chain
    },
    where() {
      return chain
    },
    limit() {
      return chain
    },
    for(modo) {
      registro.locked = modo === 'update'
      return chain
    },
    then(resolve, reject) {
      let filas
      if (registro.agregado) filas = [{ total: estado.totalPagado }]
      else if (registro.tabla === 'pagos_deuda') filas = estado.pago ? [estado.pago] : []
      else if (registro.tabla === 'deudas') filas = estado.deuda ? [estado.deuda] : []
      else filas = [{ id: 'p1', vinculoParId: null }]
      return Promise.resolve(filas).then(resolve, reject)
    },
  }
  return chain
}

function updateChain(dentroDeTx) {
  const registro = { dentroDeTx }
  estado.updates.push(registro)
  const chain = {
    set(v) {
      registro.set = v
      return chain
    },
    where() {
      return chain
    },
    returning() {
      const base = registro.tabla === 'pagos_deuda' ? estado.pago : estado.deuda
      return Promise.resolve([{ ...base, ...registro.set }])
    },
    then(resolve, reject) {
      return Promise.resolve([]).then(resolve, reject)
    },
  }
  return chain
}

vi.mock('../server/utils/db.js', () => {
  const tx = {
    select: (p) => selectChain(true, p),
    update: (tabla) => {
      const c = updateChain(true)
      estado.updates[estado.updates.length - 1].tabla = tabla
      return c
    },
  }
  return {
    db: {
      select: (p) => selectChain(false, p),
      update: (tabla) => {
        const c = updateChain(false)
        estado.updates[estado.updates.length - 1].tabla = tabla
        return c
      },
      async transaction(cb) {
        return cb(tx)
      },
    },
  }
})

vi.mock('../server/database/schema.js', () => ({
  deudas: 'deudas',
  pagosDeuda: 'pagos_deuda',
  personasEntidades: 'personas_entidades',
}))

vi.mock('../server/utils/fechaLocal.js', () => ({
  getFechaHoraLocalUsuario: async () => ({ fecha: '2026-09-09', hora: '10:00' }),
}))

vi.mock('../server/utils/vinculos.js', () => ({
  crearPagoEspejo: async () => {},
  registrarAuditoria: async () => {},
}))

vi.mock('drizzle-orm', () => ({
  eq: (a, b) => ({ a, b }),
  and: (...c) => ({ and: c }),
  isNull: (c) => ({ isNull: c }),
  sum: (c) => ({ sum: c }),
}))

const { actualizarPago, revertirPago } = await import('../server/services/pagos.service.js')

beforeEach(() => {
  estado.pago = {
    id: 'pg1',
    deudaId: 'd1',
    montoPagado: '30.00',
    fechaPago: '2026-09-01',
    metodoPago: 'yape',
    notas: null,
    vinculoPagoId: null,
  }
  estado.deuda = {
    id: 'd1',
    usuarioId: 'u1',
    concepto: 'Almuerzo',
    montoOriginal: '100.00',
    montoPendiente: '70.00',
    estado: 'parcial',
    personaEntidadId: 'p1',
    vinculoDeudaId: null,
  }
  estado.totalPagado = '30.00'
  estado.selects = []
  estado.updates = []
})

const lecturaDeuda = () => estado.selects.find((s) => s.tabla === 'deudas' && !s.join)
const lecturaSuma = () => estado.selects.find((s) => s.agregado)

describe('actualizarPago — protección contra lost update', () => {
  it('bloquea la deuda con FOR UPDATE dentro de la transacción', async () => {
    await actualizarPago({ usuarioId: 'u1', pagoId: 'pg1', body: { notas: 'x' } })
    expect(lecturaDeuda()?.dentroDeTx).toBe(true)
    expect(lecturaDeuda()?.locked).toBe(true)
    expect(estado.updates.every((u) => u.dentroDeTx)).toBe(true)
  })

  it('un cambio de monto recalcula el saldo desde la SUMA de pagos, dentro de la transacción', async () => {
    estado.totalPagado = '45.00' // la suma ya con el pago editado a 45
    const r = await actualizarPago({ usuarioId: 'u1', pagoId: 'pg1', body: { monto: 45 } })
    expect(lecturaSuma()?.dentroDeTx).toBe(true)
    expect(r.deuda.montoPendiente).toBe(55)
    expect(r.deuda.estado).toBe('parcial')
  })

  it('editar solo la fecha no toca el saldo de la deuda', async () => {
    const r = await actualizarPago({
      usuarioId: 'u1',
      pagoId: 'pg1',
      body: { fechaPago: '2026-09-02' },
    })
    expect(lecturaSuma()).toBeUndefined()
    expect(r.deuda).toBeNull()
    expect(r.pago.fechaPago).toBe('2026-09-02')
  })

  it('rechaza un monto que deja la deuda pagada de más', async () => {
    estado.totalPagado = '130.00'
    await expect(
      actualizarPago({ usuarioId: 'u1', pagoId: 'pg1', body: { monto: 130 } }),
    ).rejects.toMatchObject({ statusCode: 400 })
  })

  it('404 cuando el pago no es del usuario', async () => {
    estado.pago = null
    await expect(
      actualizarPago({ usuarioId: 'u1', pagoId: 'pg1', body: { notas: 'x' } }),
    ).rejects.toMatchObject({ statusCode: 404 })
  })
})

describe('revertirPago — protección contra lost update', () => {
  it('bloquea la deuda y recalcula desde la suma de los pagos que quedan', async () => {
    estado.totalPagado = '0' // tras soft-eliminar el único pago
    const r = await revertirPago({ usuarioId: 'u1', pagoId: 'pg1' })
    expect(lecturaDeuda()?.locked).toBe(true)
    expect(lecturaSuma()?.dentroDeTx).toBe(true)
    expect(r.nuevoPendiente).toBe(100)
    expect(estado.updates.every((u) => u.dentroDeTx)).toBe(true)
  })

  it('el pago se marca borrado (soft-delete), no se elimina', async () => {
    await revertirPago({ usuarioId: 'u1', pagoId: 'pg1' })
    const borrado = estado.updates.find((u) => u.tabla === 'pagos_deuda' && u.set?.deletedAt)
    expect(borrado, 'debe haber un UPDATE con deletedAt sobre pagos_deuda').toBeDefined()
  })
})
