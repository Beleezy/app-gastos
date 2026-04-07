import { db } from '../../utils/db.js'
import { deudas, pagosDeuda, personasEntidades } from '../../database/schema.js'
import { getUsuarioFromEvent } from '../../utils/getUsuario.js'
import { registrarAuditoria } from '../../utils/vinculos.js'
import { eq, and, sum } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const body = await readBody(event)
  const usuarioId = await getUsuarioFromEvent(event)

  const [deudaActual] = await db
    .select()
    .from(deudas)
    .where(and(eq(deudas.id, id), eq(deudas.usuarioId, usuarioId)))
    .limit(1)

  if (!deudaActual) {
    throw createError({ statusCode: 404, message: 'Deuda no encontrada' })
  }

  const updateData = { updatedAt: new Date() }
  if (body.concepto !== undefined) updateData.concepto = body.concepto.trim()
  if (body.fechaCreacion !== undefined) updateData.fechaCreacion = body.fechaCreacion
  if (body.fechaPago !== undefined) updateData.fechaPago = body.fechaPago || null
  if (body.notas !== undefined) updateData.notas = body.notas?.trim() || null
  if (body.estado !== undefined) updateData.estado = body.estado

  if (body.montoOriginal !== undefined) {
    const nuevoMontoOriginal = parseFloat(body.montoOriginal)

    const [result] = await db
      .select({ total: sum(pagosDeuda.montoPagado) })
      .from(pagosDeuda)
      .where(eq(pagosDeuda.deudaId, id))

    const totalPagado = parseFloat(result?.total || 0)
    const nuevoPendiente = Math.max(0, nuevoMontoOriginal - totalPagado)

    updateData.montoOriginal = String(nuevoMontoOriginal)
    updateData.montoPendiente = String(nuevoPendiente)

    if (nuevoPendiente <= 0) {
      updateData.estado = 'pagado'
    } else if (totalPagado > 0) {
      updateData.estado = 'parcial'
    } else {
      updateData.estado = 'pendiente'
    }
  }

  const [updated] = await db
    .update(deudas)
    .set(updateData)
    .where(and(
      eq(deudas.id, id),
      eq(deudas.usuarioId, usuarioId)
    ))
    .returning()

  // Sincronizar con deuda espejo si existe vínculo
  if (deudaActual.vinculoDeudaId) {
    const espejoData = { updatedAt: new Date() }
    if (updateData.concepto !== undefined) espejoData.concepto = updateData.concepto
    if (updateData.fechaCreacion !== undefined) espejoData.fechaCreacion = updateData.fechaCreacion
    if (updateData.fechaPago !== undefined) espejoData.fechaPago = updateData.fechaPago
    if (updateData.notas !== undefined) espejoData.notas = updateData.notas
    if (updateData.estado !== undefined) espejoData.estado = updateData.estado
    if (updateData.montoOriginal !== undefined) espejoData.montoOriginal = updateData.montoOriginal
    if (updateData.montoPendiente !== undefined) espejoData.montoPendiente = updateData.montoPendiente

    await db
      .update(deudas)
      .set(espejoData)
      .where(eq(deudas.id, deudaActual.vinculoDeudaId))

    // Registrar auditoría
    const [persona] = await db
      .select({ id: personasEntidades.id, vinculoParId: personasEntidades.vinculoParId })
      .from(personasEntidades)
      .where(eq(personasEntidades.id, deudaActual.personaEntidadId))
      .limit(1)

    if (persona?.vinculoParId) {
      await registrarAuditoria(db, {
        personaAId: deudaActual.personaEntidadId,
        personaBId: persona.vinculoParId,
        usuarioId,
        accion: 'deuda_editada',
        descripcion: `Deuda editada: "${updated.concepto}"`,
        datos: { deudaId: id, cambios: Object.keys(updateData).filter(k => k !== 'updatedAt') },
      })
    }
  }

  return {
    ...updated,
    montoOriginal: parseFloat(updated.montoOriginal),
    montoPendiente: parseFloat(updated.montoPendiente),
  }
})
