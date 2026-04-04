import { db } from '../../../utils/db.js'
import { deudas, pagosDeuda } from '../../../database/schema.js'
import { getUsuarioId } from '../../../utils/getUsuario.js'
import { eq, and } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const pagoId = getRouterParam(event, 'pagoId')
  const usuarioId = await getUsuarioId()

  // Get pago with its deuda (verify ownership via deuda.usuarioId)
  const [pago] = await db
    .select({
      id: pagosDeuda.id,
      montoPagado: pagosDeuda.montoPagado,
      deudaId: pagosDeuda.deudaId,
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

  // Get current deuda state
  const [deuda] = await db
    .select({ montoPendiente: deudas.montoPendiente, montoOriginal: deudas.montoOriginal })
    .from(deudas)
    .where(eq(deudas.id, pago.deudaId))
    .limit(1)

  const montoPagado = parseFloat(pago.montoPagado)
  const nuevoPendiente = Math.min(
    parseFloat(deuda.montoOriginal),
    parseFloat(deuda.montoPendiente) + montoPagado
  )
  const nuevoEstado = nuevoPendiente >= parseFloat(deuda.montoOriginal) ? 'pendiente' : 'parcial'

  await db.transaction(async (tx) => {
    await tx.delete(pagosDeuda).where(eq(pagosDeuda.id, pagoId))
    await tx
      .update(deudas)
      .set({
        montoPendiente: String(Math.round(nuevoPendiente * 100) / 100),
        estado: nuevoEstado,
        updatedAt: new Date(),
      })
      .where(eq(deudas.id, pago.deudaId))
  })

  return { ok: true, deudaId: pago.deudaId, nuevoPendiente }
})
