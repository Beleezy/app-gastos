import { db } from '../../../utils/db.js'
import { deudas, pagosDeuda, personasEntidades } from '../../../database/schema.js'
import { getUsuarioFromEvent } from '../../../utils/getUsuario.js'
import { registrarAuditoria } from '../../../utils/vinculos.js'
import { eq, and, sum } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const pagoId = getRouterParam(event, 'pagoId')
  const body = await readBody(event)
  const usuarioId = await getUsuarioFromEvent(event)

  // Obtener pago con su deuda (verificar propiedad)
  const [pago] = await db
    .select({
      id: pagosDeuda.id,
      montoPagado: pagosDeuda.montoPagado,
      fechaPago: pagosDeuda.fechaPago,
      metodoPago: pagosDeuda.metodoPago,
      notas: pagosDeuda.notas,
      deudaId: pagosDeuda.deudaId,
      vinculoPagoId: pagosDeuda.vinculoPagoId,
    })
    .from(pagosDeuda)
    .innerJoin(deudas, eq(pagosDeuda.deudaId, deudas.id))
    .where(and(
      eq(pagosDeuda.id, pagoId),
      eq(deudas.usuarioId, usuarioId)
    ))
    .limit(1)

  if (!pago) {
    throw createError({ statusCode: 404, message: 'Pago no encontrado' })
  }

  const updateData = {}
  if (body.fechaPago !== undefined) updateData.fechaPago = body.fechaPago
  if (body.metodoPago !== undefined) updateData.metodoPago = body.metodoPago?.trim() || null
  if (body.notas !== undefined) updateData.notas = body.notas?.trim() || null

  // Si se cambia el monto, hay que recalcular la deuda
  let deudaActualizada = null
  if (body.monto !== undefined && parseFloat(body.monto) !== parseFloat(pago.montoPagado)) {
    const nuevoMonto = parseFloat(body.monto)
    if (nuevoMonto <= 0) {
      throw createError({ statusCode: 400, message: 'El monto debe ser mayor a 0' })
    }
    updateData.montoPagado = String(nuevoMonto)

    // Recalcular monto pendiente de la deuda
    const [deudaActual] = await db
      .select()
      .from(deudas)
      .where(eq(deudas.id, pago.deudaId))
      .limit(1)

    const [result] = await db
      .select({ total: sum(pagosDeuda.montoPagado) })
      .from(pagosDeuda)
      .where(and(
        eq(pagosDeuda.deudaId, pago.deudaId),
        // Excluir el pago actual del cálculo (se reemplaza por el nuevo monto)
      ))

    // Suma total excluyendo el pago actual + nuevo monto
    const totalSinEste = await db
      .select({ total: sum(pagosDeuda.montoPagado) })
      .from(pagosDeuda)
      .where(and(
        eq(pagosDeuda.deudaId, pago.deudaId),
        eq(pagosDeuda.id, pagoId)
      ))

    const pagosOtros = await db
      .select({ id: pagosDeuda.id, montoPagado: pagosDeuda.montoPagado })
      .from(pagosDeuda)
      .where(and(
        eq(pagosDeuda.deudaId, pago.deudaId),
        eq(pagosDeuda.id, pagoId)
      ))

    // Calcular total pagado (excluyendo este pago) + nuevo monto
    const [resultOtros] = await db
      .select({ total: sum(pagosDeuda.montoPagado) })
      .from(pagosDeuda)
      .where(eq(pagosDeuda.deudaId, pago.deudaId))

    const totalActualIncluyendo = parseFloat(resultOtros?.total || 0)
    const totalSinEstePago = totalActualIncluyendo - parseFloat(pago.montoPagado)
    const nuevoTotalPagado = totalSinEstePago + nuevoMonto
    const montoOriginal = parseFloat(deudaActual.montoOriginal)
    const nuevoPendiente = Math.max(0, montoOriginal - nuevoTotalPagado)

    let nuevoEstado = 'pendiente'
    if (nuevoPendiente <= 0) nuevoEstado = 'pagado'
    else if (nuevoTotalPagado > 0) nuevoEstado = 'parcial'

    deudaActualizada = {
      id: deudaActual.id,
      montoPendiente: String(Math.round(nuevoPendiente * 100) / 100),
      estado: nuevoEstado,
      vinculoDeudaId: deudaActual.vinculoDeudaId,
    }
  }

  if (Object.keys(updateData).length === 0) {
    return { ok: true, pago }
  }

  // Obtener persona para auditoría
  const [deudaInfo] = await db
    .select({
      vinculoDeudaId: deudas.vinculoDeudaId,
      personaEntidadId: deudas.personaEntidadId,
      concepto: deudas.concepto,
    })
    .from(deudas)
    .where(eq(deudas.id, pago.deudaId))
    .limit(1)

  const [persona] = await db
    .select({ vinculoParId: personasEntidades.vinculoParId })
    .from(personasEntidades)
    .where(eq(personasEntidades.id, deudaInfo.personaEntidadId))
    .limit(1)

  const [pagoActualizado] = await db.transaction(async (tx) => {
    // Actualizar pago original
    const [updated] = await tx
      .update(pagosDeuda)
      .set(updateData)
      .where(eq(pagosDeuda.id, pagoId))
      .returning()

    // Actualizar deuda si cambia el monto
    if (deudaActualizada) {
      await tx
        .update(deudas)
        .set({
          montoPendiente: deudaActualizada.montoPendiente,
          estado: deudaActualizada.estado,
          updatedAt: new Date(),
        })
        .where(eq(deudas.id, pago.deudaId))
    }

    // Sincronizar con pago espejo si existe
    if (pago.vinculoPagoId) {
      await tx
        .update(pagosDeuda)
        .set(updateData)
        .where(eq(pagosDeuda.id, pago.vinculoPagoId))

      // Actualizar deuda espejo si cambia el monto
      if (deudaActualizada?.vinculoDeudaId) {
        await tx
          .update(deudas)
          .set({
            montoPendiente: deudaActualizada.montoPendiente,
            estado: deudaActualizada.estado,
            updatedAt: new Date(),
          })
          .where(eq(deudas.id, deudaActualizada.vinculoDeudaId))
      }
    }

    // Registrar auditoría si hay vínculo
    if (deudaInfo?.vinculoDeudaId && persona?.vinculoParId) {
      await registrarAuditoria(tx, {
        personaAId: deudaInfo.personaEntidadId,
        personaBId: persona.vinculoParId,
        usuarioId,
        accion: 'pago_editado',
        descripcion: `Pago editado para "${deudaInfo.concepto}"`,
        datos: {
          pagoId,
          deudaId: pago.deudaId,
          cambios: updateData,
        },
      })
    }

    return [updated]
  })

  return {
    pago: {
      ...pagoActualizado,
      montoPagado: parseFloat(pagoActualizado.montoPagado),
    },
  }
})
