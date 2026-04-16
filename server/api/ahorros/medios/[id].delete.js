import { db } from '../../../utils/db.js'
import { mediosAhorro } from '../../../database/schema.js'
import { getUsuarioFromEvent } from '../../../utils/getUsuario.js'
import { eq, and } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const usuarioId = await getUsuarioFromEvent(event)

  const [updated] = await db
    .update(mediosAhorro)
    .set({ activo: false })
    .where(and(eq(mediosAhorro.id, id), eq(mediosAhorro.usuarioId, usuarioId)))
    .returning()

  if (!updated) {
    throw createError({ statusCode: 404, message: 'Medio no encontrado' })
  }

  return { success: true }
})
