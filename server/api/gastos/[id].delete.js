import { db } from '../../utils/db.js'
import { gastos, gastosPlanificados } from '../../database/schema.js'
import { getUsuarioFromEvent } from '../../utils/getUsuario.js'
import { eq, and } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const usuarioId = await getUsuarioFromEvent(event)

  const [deleted] = await db.transaction(async (tx) => {
    const [gastoEliminado] = await tx
      .delete(gastos)
      .where(and(eq(gastos.id, id), eq(gastos.usuarioId, usuarioId)))
      .returning({
        id: gastos.id,
        gastoPlanificadoId: gastos.gastoPlanificadoId,
      })

    if (gastoEliminado?.gastoPlanificadoId) {
      await tx
        .update(gastosPlanificados)
        .set({
          estado: 'pendiente',
          updatedAt: new Date(),
        })
        .where(eq(gastosPlanificados.id, gastoEliminado.gastoPlanificadoId))
    }

    return [gastoEliminado]
  })

  if (!deleted) {
    throw createError({ statusCode: 404, message: 'Gasto no encontrado' })
  }

  return { success: true, id: deleted.id }
})
