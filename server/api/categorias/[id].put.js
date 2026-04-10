import { db } from '../../utils/db.js'
import { categorias } from '../../database/schema.js'
import { getUsuarioFromEvent } from '../../utils/getUsuario.js'
import { eq, and } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const usuarioId = await getUsuarioFromEvent(event)
  const id = getRouterParam(event, 'id')
  const body = await readBody(event)

  const { nombre, icono, color } = body

  if (!nombre || !icono || !color) {
    throw createError({ statusCode: 400, message: 'nombre, icono y color son requeridos' })
  }

  // Solo puede editar sus propias categorías (no predefinidas)
  const [cat] = await db
    .select()
    .from(categorias)
    .where(and(eq(categorias.id, id), eq(categorias.usuarioId, usuarioId)))
    .limit(1)

  if (!cat) {
    throw createError({ statusCode: 404, message: 'Categoría no encontrada' })
  }

  const [actualizada] = await db
    .update(categorias)
    .set({ nombre, icono, color })
    .where(eq(categorias.id, id))
    .returning()

  return actualizada
})
