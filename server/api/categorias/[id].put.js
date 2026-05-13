import { db } from '../../utils/db.js'
import { categorias } from '../../database/schema.js'
import { getUsuarioFromEvent } from '../../utils/getUsuario.js'
import { validateBody } from '../../utils/validate.js'
import { categoriaUpdateSchema } from '~/shared/schemas/categorias.js'
import { eq, and } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const usuarioId = await getUsuarioFromEvent(event)
  const id = getRouterParam(event, 'id')
  // Whitelist + tipos via Zod: nombre/icono con longitudes acotadas
  // y color con regex hex. Rechaza propiedades extras.
  const { nombre, icono, color } = await validateBody(event, categoriaUpdateSchema)

  // El handler espera los tres campos; el schema permite parciales para
  // que el cliente pueda renombrar sin reenviar icono+color, pero
  // mantenemos el check explícito si en algún caso futuro cambia.
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
