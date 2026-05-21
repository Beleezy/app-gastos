import { db } from '../../utils/db.js'
import { metas } from '../../database/schema.js'
import { getUsuarioFromEvent } from '../../utils/getUsuario.js'
import { eq, and, isNull } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const usuarioId = await getUsuarioFromEvent(event)
  const id = getRouterParam(event, 'id')

  const [updated] = await db
    .update(metas)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(and(
      eq(metas.id, id),
      eq(metas.usuarioId, usuarioId),
      isNull(metas.deletedAt),
    ))
    .returning({ id: metas.id })

  if (!updated) throw createError({ statusCode: 404, message: 'Meta no encontrada' })
  return { ok: true, id: updated.id }
})
