import { db } from '../../utils/db.js'
import { deudas } from '../../database/schema.js'
import { getUsuarioId } from '../../utils/getUsuario.js'
import { eq, and } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const usuarioId = await getUsuarioId()

  const [deleted] = await db
    .delete(deudas)
    .where(and(
      eq(deudas.id, id),
      eq(deudas.usuarioId, usuarioId)
    ))
    .returning()

  if (!deleted) {
    throw createError({ statusCode: 404, message: 'Deuda no encontrada' })
  }

  return { success: true }
})
