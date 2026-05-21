import { db } from '../../utils/db.js'
import { etiquetas } from '../../database/schema.js'
import { getUsuarioFromEvent } from '../../utils/getUsuario.js'
import { eq, and } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const usuarioId = await getUsuarioFromEvent(event)
  const id = getRouterParam(event, 'id')
  const body = await readBody(event)

  const set = {}
  if (body.nombre !== undefined) {
    const n = String(body.nombre).trim().replace(/^#/, '').slice(0, 40)
    if (!n) throw createError({ statusCode: 400, message: 'nombre inválido' })
    set.nombre = n
  }
  if (body.color !== undefined) set.color = body.color

  const [updated] = await db
    .update(etiquetas)
    .set(set)
    .where(and(eq(etiquetas.id, id), eq(etiquetas.usuarioId, usuarioId)))
    .returning()

  if (!updated) throw createError({ statusCode: 404, message: 'Etiqueta no encontrada' })
  return updated
})
