import { db } from '../../utils/db.js'
import { etiquetas } from '../../database/schema.js'
import { getUsuarioFromEvent } from '../../utils/getUsuario.js'
import { eq, and } from 'drizzle-orm'

// El DELETE CASCADE de la FK borra automáticamente las asignaciones.
export default defineEventHandler(async (event) => {
  const usuarioId = await getUsuarioFromEvent(event)
  const id = getRouterParam(event, 'id')

  const [borrado] = await db
    .delete(etiquetas)
    .where(and(eq(etiquetas.id, id), eq(etiquetas.usuarioId, usuarioId)))
    .returning({ id: etiquetas.id })

  if (!borrado) throw createError({ statusCode: 404, message: 'Etiqueta no encontrada' })
  return { ok: true, id: borrado.id }
})
