import { db } from '../../utils/db.js'
import { deudas, pagosDeuda } from '../../database/schema.js'
import { getUsuarioId } from '../../utils/getUsuario.js'
import { eq, and, sum } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const body = await readBody(event)
  const usuarioId = await getUsuarioId()

  // Get current deuda
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

  // If monto is being changed, recalculate montoPendiente based on payments
  if (body.montoOriginal !== undefined) {
    const nuevoMontoOriginal = parseFloat(body.montoOriginal)

    // Get total payments already made for this debt
    const [result] = await db
      .select({ total: sum(pagosDeuda.montoPagado) })
      .from(pagosDeuda)
      .where(eq(pagosDeuda.deudaId, id))

    const totalPagado = parseFloat(result?.total || 0)
    const nuevoPendiente = Math.max(0, nuevoMontoOriginal - totalPagado)

    updateData.montoOriginal = String(nuevoMontoOriginal)
    updateData.montoPendiente = String(nuevoPendiente)

    // Recalculate estado based on new pending amount
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

  return {
    ...updated,
    montoOriginal: parseFloat(updated.montoOriginal),
    montoPendiente: parseFloat(updated.montoPendiente),
  }
})
