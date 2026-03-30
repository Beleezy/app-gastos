import { db } from '../../utils/db.js'
import { deudas } from '../../database/schema.js'
import { getUsuarioId } from '../../utils/getUsuario.js'
import { eq, and } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const body = await readBody(event)
  const usuarioId = await getUsuarioId()

  const updateData = { updatedAt: new Date() }
  if (body.concepto !== undefined) updateData.concepto = body.concepto.trim()
  if (body.montoOriginal !== undefined) {
    updateData.montoOriginal = String(body.montoOriginal)
    updateData.montoPendiente = String(body.montoPendiente ?? body.montoOriginal)
  }
  if (body.estado !== undefined) updateData.estado = body.estado
  if (body.notas !== undefined) updateData.notas = body.notas?.trim() || null

  const [updated] = await db
    .update(deudas)
    .set(updateData)
    .where(and(
      eq(deudas.id, id),
      eq(deudas.usuarioId, usuarioId)
    ))
    .returning()

  if (!updated) {
    throw createError({ statusCode: 404, message: 'Deuda no encontrada' })
  }

  return {
    ...updated,
    montoOriginal: parseFloat(updated.montoOriginal),
    montoPendiente: parseFloat(updated.montoPendiente),
  }
})
