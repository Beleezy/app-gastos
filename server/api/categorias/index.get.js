import { db } from '../../utils/db.js'
import { categorias } from '../../database/schema.js'
import { getUsuarioFromEvent } from '../../utils/getUsuario.js'
import { eq, or, isNull } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const usuarioId = await getUsuarioFromEvent(event)

  // Verificar si el usuario ya fue provisionado (tiene categorías propias)
  const userCats = await db
    .select({ id: categorias.id })
    .from(categorias)
    .where(eq(categorias.usuarioId, usuarioId))
    .limit(1)

  if (userCats.length > 0) {
    // Usuario provisionado: retornar solo sus categorías
    return await db
      .select()
      .from(categorias)
      .where(eq(categorias.usuarioId, usuarioId))
      .orderBy(categorias.nombre)
  }

  // Usuario no provisionado: retornar predefinidas (comportamiento original)
  const result = await db
    .select()
    .from(categorias)
    .where(or(eq(categorias.esPredefinida, true), isNull(categorias.usuarioId)))
    .orderBy(categorias.nombre)

  return result
})
