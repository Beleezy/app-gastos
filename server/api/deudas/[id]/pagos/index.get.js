import { db } from '../../../../utils/db.js'
import { pagosDeuda, deudas } from '../../../../database/schema.js'
import { getUsuarioFromEvent } from '../../../../utils/getUsuario.js'
import { eq, and, isNull } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const deudaId = getRouterParam(event, 'id')
  const usuarioId = await getUsuarioFromEvent(event)
  setHeader(event, 'Cache-Control', 'private, max-age=60, stale-while-revalidate=300')

  // Verify deuda belongs to user
  const [deuda] = await db
    .select({ id: deudas.id })
    .from(deudas)
    .where(and(
      eq(deudas.id, deudaId),
      eq(deudas.usuarioId, usuarioId),
      isNull(deudas.deletedAt)
    ))
    .limit(1)

  if (!deuda) {
    throw createError({ statusCode: 404, message: 'Deuda no encontrada' })
  }

  const pagos = await db
    .select()
    .from(pagosDeuda)
    .where(and(eq(pagosDeuda.deudaId, deudaId), isNull(pagosDeuda.deletedAt)))
    .orderBy(pagosDeuda.fechaPago)

  return pagos.map(p => ({
    ...p,
    montoPagado: parseFloat(p.montoPagado),
  }))
})
