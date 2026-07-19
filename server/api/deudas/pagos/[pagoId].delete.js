import { db } from '../../../utils/db.js'
import { deudas, pagosDeuda, personasEntidades } from '../../../database/schema.js'
import { getUsuarioFromEvent } from '../../../utils/getUsuario.js'
import { registrarAuditoria } from '../../../utils/vinculos.js'
import { eq, and, isNull } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const pagoId = getRouterParam(event, 'pagoId')
  const usuarioId = await getUsuarioFromEvent(event)

  const [pago] = await db
    .select({
      id: pagosDeuda.id,
      montoPagado: pagosDeuda.montoPagado,
      deudaId: pagosDeuda.deudaId,
      vinculoPagoId: pagosDeuda.vinculoPagoId,
      metodoPago: pagosDeuda.metodoPago,
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

  if (!pago) {
    throw createError({ statusCode: 404, message: 'Pago no encontrado' })
  }

  const [deuda] = await db
    .select({
      montoPendiente: deudas.montoPendiente,
      montoOriginal: deudas.montoOriginal,
      vinculoDeudaId: deudas.vinculoDeudaId,
      personaEntidadId: deudas.personaEntidadId,
      concepto: deudas.concepto,
    })
    .from(deudas)
    .where(and(eq(deudas.id, pago.deudaId), isNull(deudas.deletedAt)))
    .limit(1)

  const montoPagado = parseFloat(pago.montoPagado)
  const nuevoPendiente = Math.min(
    parseFloat(deuda.montoOriginal),
    parseFloat(deuda.montoPendiente) + montoPagado,
  )
  const nuevoEstado = nuevoPendiente >= parseFloat(deuda.montoOriginal) ? 'pendiente' : 'parcial'

  // Obtener persona para auditoría
  const [persona] = await db
    .select({ vinculoParId: personasEntidades.vinculoParId })
    .from(personasEntidades)
    .where(eq(personasEntidades.id, deuda.personaEntidadId))
    .limit(1)

  await db.transaction(async (tx) => {
    if (pago.vinculoPagoId && deuda.vinculoDeudaId) {
      // Desvincular ambos pagos primero
      await tx
        .update(pagosDeuda)
        .set({ vinculoPagoId: null })
        .where(eq(pagosDeuda.id, pago.vinculoPagoId))
      await tx.update(pagosDeuda).set({ vinculoPagoId: null }).where(eq(pagosDeuda.id, pagoId))
      // Soft-eliminar pago espejo
      await tx
        .update(pagosDeuda)
        .set({ deletedAt: new Date() })
        .where(and(eq(pagosDeuda.id, pago.vinculoPagoId), isNull(pagosDeuda.deletedAt)))
      // Actualizar deuda espejo
      await tx
        .update(deudas)
        .set({
          montoPendiente: String(Math.round(nuevoPendiente * 100) / 100),
          estado: nuevoEstado,
          updatedAt: new Date(),
        })
        .where(and(eq(deudas.id, deuda.vinculoDeudaId), isNull(deudas.deletedAt)))
    }

    // Soft-eliminar pago original y actualizar deuda
    await tx
      .update(pagosDeuda)
      .set({ deletedAt: new Date() })
      .where(and(eq(pagosDeuda.id, pagoId), isNull(pagosDeuda.deletedAt)))
    await tx
      .update(deudas)
      .set({
        montoPendiente: String(Math.round(nuevoPendiente * 100) / 100),
        estado: nuevoEstado,
        updatedAt: new Date(),
      })
      .where(and(eq(deudas.id, pago.deudaId), isNull(deudas.deletedAt)))

    // Registrar auditoría si hay vínculo
    if (deuda.vinculoDeudaId && persona?.vinculoParId) {
      await registrarAuditoria(tx, {
        personaAId: deuda.personaEntidadId,
        personaBId: persona.vinculoParId,
        usuarioId,
        accion: 'pago_revertido',
        descripcion: `Pago revertido: S/ ${montoPagado} de "${deuda.concepto}"${pago.metodoPago ? ` (${pago.metodoPago})` : ''}`,
        datos: { pagoId, deudaId: pago.deudaId, monto: montoPagado },
      })
    }
  })

  return { ok: true, deudaId: pago.deudaId, nuevoPendiente }
})
