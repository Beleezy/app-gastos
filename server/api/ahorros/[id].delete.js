import { db } from '../../utils/db.js'
import { ahorros } from '../../database/schema.js'
import { getUsuarioFromEvent } from '../../utils/getUsuario.js'
import { eq, and } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const usuarioId = await getUsuarioFromEvent(event)

  const [deleted] = await db
    .delete(ahorros)
    .where(and(eq(ahorros.id, id), eq(ahorros.usuarioId, usuarioId)))
    .returning({ id: ahorros.id })

  if (!deleted) {
    throw createError({ statusCode: 404, message: 'Ahorro no encontrado' })
  }

  return { success: true }
})
