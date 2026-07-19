import { db } from '../../utils/db.js'
import { gastos, gastosPlanificados } from '../../database/schema.js'
import { getUsuarioFromEvent } from '../../utils/getUsuario.js'
import { eq, and, isNull } from 'drizzle-orm'

// Soft delete: marca deleted_at en vez de borrar. Recuperable desde la
// papelera durante 30 días.
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const usuarioId = await getUsuarioFromEvent(event)

  const [deleted] = await db.transaction(async (tx) => {
    const [gastoEliminado] = await tx
      .update(gastos)
      .set({ deletedAt: new Date() })
      .where(and(eq(gastos.id, id), eq(gastos.usuarioId, usuarioId), isNull(gastos.deletedAt)))
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
