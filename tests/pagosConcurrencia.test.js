// Regresión del "lost update" al registrar pagos de deuda.
//
// El bug: `registrarPago` leía `deudas.monto_pendiente` con un SELECT
// FUERA de la transacción, calculaba `nuevoPendiente` en JS y escribía
// ese valor ABSOLUTO dentro de ella. Dos pagos concurrentes sobre la
// misma deuda leen ambos el mismo pendiente (100), cada uno calcula su
// saldo sobre él (100-60=40) y el segundo UPDATE pisa al primero: se
// cobraron 120 y el saldo dice 40. El dinero del primer pago desaparece.
//
// No es teórico en esta app: la cola offline (useSyncQueue) reintenta
// mutaciones y el doble tap en móvil dispara dos POST casi simultáneos.
//
// La condición que fija este test es estructural, porque es lo que se
// puede verificar sin un Postgres real: la fila se lee DENTRO de la
// transacción y con `FOR UPDATE`, de modo que el segundo pago espera al
// commit del primero y recalcula sobre el saldo ya actualizado.

import { describe, it, expect, vi, beforeEach } from 'vitest'

const { estado } = vi.hoisted(() => ({
  estado: {
    deuda: null,
    enTransaccion: false,
    selects: [],
    updates: [],
  },
}))

function selectChain(dentroDeTx) {
  const registro = { dentroDeTx, locked: false }
  estado.selects.push(registro)
  const chain = {
    from(tabla) {
      registro.tabla = tabla
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
      // La primera lectura de la deuda devuelve la fila; el resto
      // (persona) devuelve una fila neutra sin vínculo.
      const filas = registro.tabla === 'deudas' ? [estado.deuda] : [{ id: 'p1', vinculoParId: null }]
      return Promise.resolve(filas).then(resolve, reject)
    },
  }
  return chain
}

function insertChain() {
  const chain = {
    values(v) {
      chain._v = v
      return chain
    },
    returning() {
      return Promise.resolve([{ id: 'pago-1', ...chain._v }])
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
      return Promise.resolve([{ ...estado.deuda, ...registro.set }])
    },
  }
  return chain
}

vi.mock('../server/utils/db.js', () => {
  const tx = {
    select: () => selectChain(true),
    insert: () => insertChain(),
    update: () => updateChain(true),
  }
  return {
    db: {
      select: () => selectChain(false),
      insert: () => insertChain(),
      update: () => updateChain(false),
      async transaction(cb) {
        estado.enTransaccion = true
        try {
          return await cb(tx)
        } finally {
          estado.enTransaccion = false
        }
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
}))

const { registrarPago } = await import('../server/services/pagos.service.js')

beforeEach(() => {
  estado.deuda = {
    id: 'd1',
    usuarioId: 'u1',
    concepto: 'Almuerzo',
    montoOriginal: '100.00',
    montoPendiente: '100.00',
    estado: 'pendiente',
    personaEntidadId: 'p1',
    vinculoDeudaId: null,
  }
  estado.selects = []
  estado.updates = []
})

describe('registrarPago — protección contra lost update', () => {
  it('lee la deuda DENTRO de la transacción', async () => {
    await registrarPago({ usuarioId: 'u1', deudaId: 'd1', body: { monto: 30 } })

    const lecturaDeuda = estado.selects.find((s) => s.tabla === 'deudas')
    expect(lecturaDeuda, 'debe leer la deuda').toBeDefined()
    expect(lecturaDeuda.dentroDeTx, 'la lectura debe ocurrir dentro de db.transaction').toBe(true)
  })

  it('bloquea la fila con FOR UPDATE', async () => {
    await registrarPago({ usuarioId: 'u1', deudaId: 'd1', body: { monto: 30 } })

    const lecturaDeuda = estado.selects.find((s) => s.tabla === 'deudas')
    expect(lecturaDeuda.locked, 'la lectura de la deuda debe usar FOR UPDATE').toBe(true)
  })

  it('el UPDATE del saldo ocurre dentro de la transacción', async () => {
    await registrarPago({ usuarioId: 'u1', deudaId: 'd1', body: { monto: 30 } })

    expect(estado.updates.length).toBeGreaterThan(0)
    expect(estado.updates.every((u) => u.dentroDeTx)).toBe(true)
  })

  it('rechaza un pago que excede el saldo pendiente', async () => {
    await expect(
      registrarPago({ usuarioId: 'u1', deudaId: 'd1', body: { monto: 150 } }),
    ).rejects.toMatchObject({ statusCode: 400 })
  })

  it('un pago exacto deja la deuda en pagado con saldo 0', async () => {
    const r = await registrarPago({ usuarioId: 'u1', deudaId: 'd1', body: { monto: 100 } })
    expect(r.deuda.montoPendiente).toBe(0)
    expect(r.deuda.estado).toBe('pagado')
  })

  it('redondea a céntimos en vez de arrastrar drift binario', async () => {
    estado.deuda.montoPendiente = '0.30'
    const r = await registrarPago({ usuarioId: 'u1', deudaId: 'd1', body: { monto: 0.1 } })
    // 0.30 - 0.1 en binario es 0.19999999999999998; el saldo guardado
    // debe ser 0.2 exacto, no el residuo.
    expect(r.deuda.montoPendiente).toBe(0.2)
  })

  it('404 cuando la deuda no existe o no es del usuario', async () => {
    estado.deuda = undefined
    await expect(
      registrarPago({ usuarioId: 'u1', deudaId: 'd1', body: { monto: 10 } }),
    ).rejects.toMatchObject({ statusCode: 404 })
  })
})
