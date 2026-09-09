import { and, eq } from 'drizzle-orm'
import { db } from '../../../utils/db.js'
import { gastosFuturos } from '../../../database/schema.js'
import { getUsuarioFromEvent } from '../../../utils/getUsuario.js'
import { getUuidParam } from '../../../utils/params.js'

export default defineEventHandler(async (event) => {
  const id = getUuidParam(event, 'id', { recurso: 'Proyecto' })
  const usuarioId = await getUsuarioFromEvent(event)

  const [deleted] = await db
    .delete(gastosFuturos)
    .where(and(eq(gastosFuturos.id, id), eq(gastosFuturos.usuarioId, usuarioId)))
    .returning({ id: gastosFuturos.id })

  if (!deleted) {
    throw createError({ statusCode: 404, message: 'Gasto futuro no encontrado' })
  }

  return { ok: true }
})
