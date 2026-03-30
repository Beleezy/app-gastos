import { db } from '../../../../utils/db.js'
import { pagosDeuda, deudas } from '../../../../database/schema.js'
import { getUsuarioId } from '../../../../utils/getUsuario.js'
import { eq, and } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const deudaId = getRouterParam(event, 'id')
  const usuarioId = await getUsuarioId()

  // Verify deuda belongs to user
  const [deuda] = await db
    .select({ id: deudas.id })
    .from(deudas)
    .where(and(
      eq(deudas.id, deudaId),
      eq(deudas.usuarioId, usuarioId)
    ))
    .limit(1)

  if (!deuda) {
    throw createError({ statusCode: 404, message: 'Deuda no encontrada' })
  }

  const pagos = await db
    .select()
    .from(pagosDeuda)
    .where(eq(pagosDeuda.deudaId, deudaId))
    .orderBy(pagosDeuda.fechaPago)

  return pagos.map(p => ({
    ...p,
    montoPagado: parseFloat(p.montoPagado),
  }))
})
