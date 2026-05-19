import { db } from '../../../../utils/db.js'
import { deudas, pagosDeuda, personasEntidades } from '../../../../database/schema.js'
import { getUsuarioFromEvent } from '../../../../utils/getUsuario.js'
import { eq, and, desc, isNull } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const personaId = getRouterParam(event, 'id')
  const usuarioId = await getUsuarioFromEvent(event)
  setHeader(event, 'Cache-Control', 'private, max-age=60, stale-while-revalidate=300')

  // Verify persona belongs to user
  const [persona] = await db
    .select({ id: personasEntidades.id })
    .from(personasEntidades)
    .where(and(
      eq(personasEntidades.id, personaId),
      eq(personasEntidades.usuarioId, usuarioId)
    ))
    .limit(1)

  if (!persona) {
    throw createError({ statusCode: 404, message: 'Persona no encontrada' })
  }

  // Get all payments for this person's debts, joined with deuda info
  const pagos = await db
    .select({
      id: pagosDeuda.id,
      deudaId: pagosDeuda.deudaId,
      montoPagado: pagosDeuda.montoPagado,
      fechaPago: pagosDeuda.fechaPago,
      metodoPago: pagosDeuda.metodoPago,
      notas: pagosDeuda.notas,
      createdAt: pagosDeuda.createdAt,
      deudaConcepto: deudas.concepto,
      deudaMontoOriginal: deudas.montoOriginal,
    })
    .from(pagosDeuda)
    .innerJoin(deudas, eq(pagosDeuda.deudaId, deudas.id))
    .where(and(
      eq(deudas.personaEntidadId, personaId),
      eq(deudas.usuarioId, usuarioId),
      isNull(deudas.deletedAt),
      isNull(pagosDeuda.deletedAt)
    ))
    .orderBy(desc(pagosDeuda.createdAt))

  // Group payments by fecha + createdAt proximity (same transaction = same global payment)
  // Payments made in the same global payment share the same createdAt (within 2 seconds)
  const grupos = []
  let grupoActual = null

  for (const pago of pagos) {
    const pagoTime = new Date(pago.createdAt).getTime()

    if (!grupoActual || Math.abs(pagoTime - grupoActual.timestamp) > 2000 || pago.fechaPago !== grupoActual.fechaPago) {
      grupoActual = {
        fechaPago: pago.fechaPago,
        metodoPago: pago.metodoPago,
        notas: pago.notas,
        timestamp: pagoTime,
        createdAt: pago.createdAt,
        montoTotal: 0,
        pagoIds: [],
        detalles: [],
      }
      grupos.push(grupoActual)
    }

    const monto = parseFloat(pago.montoPagado)
    grupoActual.montoTotal += monto
    grupoActual.pagoIds.push(pago.id)
    grupoActual.detalles.push({
      pagoId: pago.id,
      deudaId: pago.deudaId,
      concepto: pago.deudaConcepto,
      montoPagado: monto,
      metodoPago: pago.metodoPago,
    })
  }

  // Round totals
  grupos.forEach(g => {
    g.montoTotal = Math.round(g.montoTotal * 100) / 100
  })

  return grupos
})
