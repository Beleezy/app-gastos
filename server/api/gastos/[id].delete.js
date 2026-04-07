import { db } from '../../utils/db.js'
import { gastos } from '../../database/schema.js'
import { getUsuarioFromEvent } from '../../utils/getUsuario.js'
import { eq, and } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const usuarioId = await getUsuarioFromEvent(event)

  const [deleted] = await db
    .delete(gastos)
    .where(and(eq(gastos.id, id), eq(gastos.usuarioId, usuarioId)))
    .returning({ id: gastos.id })

  if (!deleted) {
    throw createError({ statusCode: 404, message: 'Gasto no encontrado' })
  }

  return { success: true, id: deleted.id }
})
