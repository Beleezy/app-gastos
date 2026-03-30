import { db } from '../../../utils/db.js'
import { personasEntidades } from '../../../database/schema.js'
import { getUsuarioId } from '../../../utils/getUsuario.js'
import { eq, and } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const usuarioId = await getUsuarioId()

  const [deleted] = await db
    .delete(personasEntidades)
    .where(and(
      eq(personasEntidades.id, id),
      eq(personasEntidades.usuarioId, usuarioId)
    ))
    .returning()

  if (!deleted) {
    throw createError({ statusCode: 404, message: 'Persona no encontrada' })
  }

  return { success: true }
})
