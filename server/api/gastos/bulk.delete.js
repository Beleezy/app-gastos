import { db } from '../../utils/db.js'
import { gastos, gastosPlanificados } from '../../database/schema.js'
import { getUsuarioFromEvent } from '../../utils/getUsuario.js'
import { rateLimits } from '../../utils/rateLimit.js'
import { eq, and, inArray } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const usuarioId = await getUsuarioFromEvent(event)
  await rateLimits.bulkOp(event, usuarioId)

  if (!Array.isArray(body?.ids) || body.ids.length === 0) {
    throw createError({ statusCode: 400, message: 'Se requiere un array de ids' })
  }

  // Sanitizar: solo strings/números
  const ids = body.ids.filter(id => typeof id === 'string' || typeof id === 'number').map(String)
  if (ids.length === 0) {
    throw createError({ statusCode: 400, message: 'Ids inválidos' })
  }
  if (ids.length > 500) {
    throw createError({ statusCode: 400, message: 'Máximo 500 gastos por operación' })
  }

  const eliminados = await db.transaction(async (tx) => {
    const borrados = await tx
      .delete(gastos)
      .where(and(inArray(gastos.id, ids), eq(gastos.usuarioId, usuarioId)))
      .returning({
        id: gastos.id,
        gastoPlanificadoId: gastos.gastoPlanificadoId,
      })

    const planificadosIds = borrados
      .map(g => g.gastoPlanificadoId)
      .filter(Boolean)

    if (planificadosIds.length > 0) {
      await tx
        .update(gastosPlanificados)
        .set({ estado: 'pendiente', updatedAt: new Date() })
        .where(inArray(gastosPlanificados.id, planificadosIds))
    }

    return borrados
  })

  return { success: true, eliminados: eliminados.length, ids: eliminados.map(g => g.id) }
})
