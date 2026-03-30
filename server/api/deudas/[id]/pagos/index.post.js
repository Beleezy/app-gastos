import { db } from '../../../../utils/db.js'
import { pagosDeuda, deudas } from '../../../../database/schema.js'
import { getUsuarioId } from '../../../../utils/getUsuario.js'
import { eq, and } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const deudaId = getRouterParam(event, 'id')
  const body = await readBody(event)
  const usuarioId = await getUsuarioId()

  if (!body.monto || body.monto <= 0) {
    throw createError({ statusCode: 400, message: 'El monto debe ser mayor a 0' })
  }

  // Get deuda and verify ownership
  const [deuda] = await db
    .select()
    .from(deudas)
    .where(and(
      eq(deudas.id, deudaId),
      eq(deudas.usuarioId, usuarioId)
    ))
    .limit(1)

  if (!deuda) {
    throw createError({ statusCode: 404, message: 'Deuda no encontrada' })
  }

  const montoPago = parseFloat(body.monto)
  const pendienteActual = parseFloat(deuda.montoPendiente)

  if (montoPago > pendienteActual) {
    throw createError({ statusCode: 400, message: 'El monto del pago excede la deuda pendiente' })
  }

  // Create payment
  const [pago] = await db
    .insert(pagosDeuda)
    .values({
      deudaId,
      montoPagado: String(montoPago),
      fechaPago: body.fecha || new Date().toISOString().split('T')[0],
      metodoPago: body.metodoPago?.trim() || null,
      notas: body.notas?.trim() || null,
    })
    .returning()

  // Update deuda pending amount and status
  const nuevoPendiente = pendienteActual - montoPago
  const nuevoEstado = nuevoPendiente <= 0 ? 'pagado' : 'parcial'

  const [deudaActualizada] = await db
    .update(deudas)
    .set({
      montoPendiente: String(Math.max(0, nuevoPendiente)),
      estado: nuevoEstado,
      updatedAt: new Date(),
    })
    .where(eq(deudas.id, deudaId))
    .returning()

  return {
    pago: {
      ...pago,
      montoPagado: parseFloat(pago.montoPagado),
    },
    deuda: {
      ...deudaActualizada,
      montoOriginal: parseFloat(deudaActualizada.montoOriginal),
      montoPendiente: parseFloat(deudaActualizada.montoPendiente),
    },
  }
})
