// Capa de servicios para pagos de deudas. Ver §2.1 / §4.7 de planifica.md.

import { eq, and, isNull, sum } from 'drizzle-orm'
import { db } from '../utils/db.js'
import { pagosDeuda, deudas, personasEntidades } from '../database/schema.js'
import { crearPagoEspejo, registrarAuditoria } from '../utils/vinculos.js'
import { getFechaHoraLocalUsuario } from '../utils/fechaLocal.js'
import { assertOwner } from '../utils/assertOwner.js'
import { calcularSaldoTrasPago, calcularSaldoDesdePagos } from '../utils/pagosMath.js'

const TOLERANCIA = 0.005

function errorHttp(statusCode, message) {
  const err = new Error(message)
  err.statusCode = statusCode
  return err
}

/**
 * Registra un pago contra una deuda. Actualiza monto pendiente y estado
 * (parcial / pagado). Si la deuda tiene vinculo, replica el pago en la
 * deuda espejo y registra auditoría.
 *
 * CONCURRENCIA: la deuda se lee DENTRO de la transacción y con
 * `FOR UPDATE`. Antes se leía fuera, se calculaba el saldo en JS y se
 * escribía ese valor absoluto: dos pagos simultáneos leían el mismo
 * `monto_pendiente`, calculaban sobre él y el segundo UPDATE pisaba al
 * primero — se cobraban ambos y el saldo solo descontaba uno. No es
 * hipotético: la cola offline (useSyncQueue) reintenta mutaciones y el
 * doble tap en móvil manda dos POST casi a la vez. Con el lock, el
 * segundo pago espera el commit del primero y recalcula sobre el saldo
 * ya actualizado (o es rechazado por exceder el pendiente).
 *
 * @param {object} input
 * @param {string} input.usuarioId
 * @param {string} input.deudaId
 * @param {object} input.body Body validado por Zod (pagoCreateSchema).
 */
export async function registrarPago({ usuarioId, deudaId, body }) {
  const fechaPago =
    body.fechaPago || body.fecha || (await getFechaHoraLocalUsuario(usuarioId)).fecha

  const resultado = await db.transaction(async (tx) => {
    const [deuda] = await tx
      .select()
      .from(deudas)
      .where(and(eq(deudas.id, deudaId), eq(deudas.usuarioId, usuarioId), isNull(deudas.deletedAt)))
      .limit(1)
      .for('update')

    assertOwner(deuda, usuarioId, { recurso: 'Deuda' })

    const montoPago = parseFloat(body.monto)

    // El cálculo del saldo vive en pagosMath.calcularSaldoTrasPago, que es
    // el que cubren los tests. Antes esta función lo reimplementaba inline
    // y sin el redondeo a céntimos, así que lo verificado y lo desplegado
    // no eran la misma aritmética.
    const { nuevoPendiente, nuevoEstado, excede } = calcularSaldoTrasPago({
      pendienteActual: deuda.montoPendiente,
      montoPago,
    })

    if (excede) throw errorHttp(400, 'El monto del pago excede la deuda pendiente')

    const [persona] = await tx
      .select({ id: personasEntidades.id, vinculoParId: personasEntidades.vinculoParId })
      .from(personasEntidades)
      .where(eq(personasEntidades.id, deuda.personaEntidadId))
      .limit(1)

    const [pago] = await tx
      .insert(pagosDeuda)
      .values({
        deudaId,
        montoPagado: String(montoPago),
        fechaPago,
        metodoPago: body.metodoPago?.trim() || null,
        notas: body.notas?.trim() || null,
      })
      .returning()

    const [deudaActualizada] = await tx
      .update(deudas)
      .set({
        montoPendiente: String(nuevoPendiente),
        estado: nuevoEstado,
        updatedAt: new Date(),
      })
      .where(and(eq(deudas.id, deudaId), isNull(deudas.deletedAt)))
      .returning()

    if (deuda.vinculoDeudaId) {
      await crearPagoEspejo(tx, pago, deuda.vinculoDeudaId)
      await tx
        .update(deudas)
        .set({
          montoPendiente: String(nuevoPendiente),
          estado: nuevoEstado,
          updatedAt: new Date(),
        })
        .where(and(eq(deudas.id, deuda.vinculoDeudaId), isNull(deudas.deletedAt)))

      if (persona?.vinculoParId) {
        await registrarAuditoria(tx, {
          personaAId: deuda.personaEntidadId,
          personaBId: persona.vinculoParId,
          usuarioId,
          accion: 'pago_creado',
          descripcion: `Pago de S/ ${montoPago} para "${deuda.concepto}"${body.metodoPago ? ` vía ${body.metodoPago}` : ''}`,
          datos: {
            pagoId: pago.id,
            deudaId,
            monto: montoPago,
            metodoPago: body.metodoPago || null,
          },
        })
      }
    }

    return { pago, deudaActualizada }
  })

  return {
    pago: {
      ...resultado.pago,
      montoPagado: parseFloat(resultado.pago.montoPagado),
    },
    deuda: {
      ...resultado.deudaActualizada,
      montoOriginal: parseFloat(resultado.deudaActualizada.montoOriginal),
      montoPendiente: parseFloat(resultado.deudaActualizada.montoPendiente),
    },
  }
}

/**
 * Pago del usuario (por la deuda que lo contiene) con su deuda BLOQUEADA.
 *
 * Es el punto de partida de editar y revertir: el `FOR UPDATE` sobre la
 * deuda serializa cualquier otra escritura de saldo sobre ella —otro pago,
 * otra reversión— hasta que esta transacción confirme.
 */
async function cargarPagoConDeudaBloqueada(tx, { usuarioId, pagoId }) {
  const [pago] = await tx
    .select({
      id: pagosDeuda.id,
      deudaId: pagosDeuda.deudaId,
      montoPagado: pagosDeuda.montoPagado,
      fechaPago: pagosDeuda.fechaPago,
      metodoPago: pagosDeuda.metodoPago,
      notas: pagosDeuda.notas,
      vinculoPagoId: pagosDeuda.vinculoPagoId,
    })
    .from(pagosDeuda)
    .innerJoin(deudas, eq(pagosDeuda.deudaId, deudas.id))
    .where(
      and(
        eq(pagosDeuda.id, pagoId),
        eq(deudas.usuarioId, usuarioId),
        isNull(pagosDeuda.deletedAt),
        isNull(deudas.deletedAt),
      ),
    )
    .limit(1)

  if (!pago) throw errorHttp(404, 'Pago no encontrado')

  const [deuda] = await tx
    .select()
    .from(deudas)
    .where(and(eq(deudas.id, pago.deudaId), isNull(deudas.deletedAt)))
    .limit(1)
    .for('update')

  assertOwner(deuda, usuarioId, { recurso: 'Deuda' })
  return { pago, deuda }
}

/** Suma de los pagos vivos de una deuda, dentro de la transacción. */
async function totalPagadoDe(tx, deudaId) {
  const [fila] = await tx
    .select({ total: sum(pagosDeuda.montoPagado) })
    .from(pagosDeuda)
    .where(and(eq(pagosDeuda.deudaId, deudaId), isNull(pagosDeuda.deletedAt)))
  return parseFloat(fila?.total || 0)
}

/** Escribe el saldo recalculado en la deuda y, si está vinculada, en su espejo. */
async function escribirSaldo(tx, deuda, { nuevoPendiente, nuevoEstado }) {
  const set = {
    montoPendiente: String(nuevoPendiente),
    estado: nuevoEstado,
    updatedAt: new Date(),
  }
  const [actualizada] = await tx
    .update(deudas)
    .set(set)
    .where(and(eq(deudas.id, deuda.id), isNull(deudas.deletedAt)))
    .returning()

  if (deuda.vinculoDeudaId) {
    await tx
      .update(deudas)
      .set(set)
      .where(and(eq(deudas.id, deuda.vinculoDeudaId), isNull(deudas.deletedAt)))
  }
  return actualizada
}

async function auditarSiVinculada(tx, deuda, usuarioId, entrada) {
  if (!deuda.vinculoDeudaId) return
  const [persona] = await tx
    .select({ vinculoParId: personasEntidades.vinculoParId })
    .from(personasEntidades)
    .where(eq(personasEntidades.id, deuda.personaEntidadId))
    .limit(1)
  if (!persona?.vinculoParId) return
  await registrarAuditoria(tx, {
    personaAId: deuda.personaEntidadId,
    personaBId: persona.vinculoParId,
    usuarioId,
    ...entrada,
  })
}

/**
 * Edita un pago (fecha, método, notas y opcionalmente el monto).
 *
 * Antes el handler leía la deuda y la suma de pagos FUERA de la
 * transacción, calculaba el pendiente en JS y escribía ese valor absoluto
 * — el mismo lost update que cerró el PR #100 en `registrarPago`, más tres
 * consultas cuyo resultado no se usaba. Ahora la deuda se bloquea con
 * `FOR UPDATE`, se actualiza el pago y el saldo se recalcula desde la SUMA
 * de pagos vivos (`calcularSaldoDesdePagos`) dentro de la misma
 * transacción.
 *
 * @param {object} input
 * @param {string} input.usuarioId
 * @param {string} input.pagoId
 * @param {object} input.body Body validado por Zod (pagoUpdateSchema).
 */
export async function actualizarPago({ usuarioId, pagoId, body }) {
  const resultado = await db.transaction(async (tx) => {
    const { pago, deuda } = await cargarPagoConDeudaBloqueada(tx, { usuarioId, pagoId })

    const set = {}
    if (body.fechaPago !== undefined) set.fechaPago = body.fechaPago
    if (body.metodoPago !== undefined) set.metodoPago = body.metodoPago?.trim() || null
    if (body.notas !== undefined) set.notas = body.notas?.trim() || null

    const montoNuevo =
      body.monto !== undefined ? Math.round(parseFloat(body.monto) * 100) / 100 : null
    const cambiaMonto = montoNuevo !== null && montoNuevo !== parseFloat(pago.montoPagado)
    if (cambiaMonto) set.montoPagado = String(montoNuevo)

    if (Object.keys(set).length === 0) return { pago, deuda: null }

    const [actualizado] = await tx
      .update(pagosDeuda)
      .set(set)
      .where(and(eq(pagosDeuda.id, pagoId), isNull(pagosDeuda.deletedAt)))
      .returning()

    // El espejo recibe los mismos cambios; el saldo espejo lo escribe
    // escribirSaldo.
    if (pago.vinculoPagoId) {
      await tx
        .update(pagosDeuda)
        .set(set)
        .where(and(eq(pagosDeuda.id, pago.vinculoPagoId), isNull(pagosDeuda.deletedAt)))
    }

    let deudaActualizada = null
    if (cambiaMonto) {
      const totalPagado = await totalPagadoDe(tx, deuda.id)
      if (totalPagado > parseFloat(deuda.montoOriginal) + TOLERANCIA) {
        // Al lanzar, la transacción hace rollback del UPDATE del pago.
        throw errorHttp(400, 'El monto del pago excede la deuda pendiente')
      }
      deudaActualizada = await escribirSaldo(
        tx,
        deuda,
        calcularSaldoDesdePagos({ montoOriginal: deuda.montoOriginal, totalPagado }),
      )
    }

    await auditarSiVinculada(tx, deuda, usuarioId, {
      accion: 'pago_editado',
      descripcion: `Pago editado para "${deuda.concepto}"`,
      datos: { pagoId, deudaId: deuda.id, cambios: set },
    })

    return { pago: actualizado, deuda: deudaActualizada }
  })

  return {
    pago: { ...resultado.pago, montoPagado: parseFloat(resultado.pago.montoPagado) },
    deuda: resultado.deuda
      ? {
          ...resultado.deuda,
          montoOriginal: parseFloat(resultado.deuda.montoOriginal),
          montoPendiente: parseFloat(resultado.deuda.montoPendiente),
        }
      : null,
  }
}

/**
 * Revierte (soft-delete) un pago y devuelve el saldo a la deuda.
 *
 * Mismo tratamiento de concurrencia que `actualizarPago`: la deuda se
 * bloquea y el pendiente sale de la suma de los pagos que quedan vivos, no
 * de `pendiente + montoRevertido` calculado con una lectura previa.
 */
export async function revertirPago({ usuarioId, pagoId }) {
  const resultado = await db.transaction(async (tx) => {
    const { pago, deuda } = await cargarPagoConDeudaBloqueada(tx, { usuarioId, pagoId })
    const ahora = new Date()

    if (pago.vinculoPagoId) {
      // Desvincular ambos lados y soft-eliminar el espejo.
      await tx
        .update(pagosDeuda)
        .set({ vinculoPagoId: null, deletedAt: ahora })
        .where(and(eq(pagosDeuda.id, pago.vinculoPagoId), isNull(pagosDeuda.deletedAt)))
    }

    await tx
      .update(pagosDeuda)
      .set({ vinculoPagoId: null, deletedAt: ahora })
      .where(and(eq(pagosDeuda.id, pagoId), isNull(pagosDeuda.deletedAt)))

    const totalPagado = await totalPagadoDe(tx, deuda.id)
    const saldo = calcularSaldoDesdePagos({ montoOriginal: deuda.montoOriginal, totalPagado })
    const deudaActualizada = await escribirSaldo(tx, deuda, saldo)

    const montoPagado = parseFloat(pago.montoPagado)
    await auditarSiVinculada(tx, deuda, usuarioId, {
      accion: 'pago_revertido',
      descripcion: `Pago revertido: S/ ${montoPagado} de "${deuda.concepto}"${pago.metodoPago ? ` (${pago.metodoPago})` : ''}`,
      datos: { pagoId, deudaId: deuda.id, monto: montoPagado },
    })

    return { deudaActualizada, nuevoPendiente: saldo.nuevoPendiente }
  })

  return {
    ok: true,
    deudaId: resultado.deudaActualizada.id,
    nuevoPendiente: resultado.nuevoPendiente,
  }
}
