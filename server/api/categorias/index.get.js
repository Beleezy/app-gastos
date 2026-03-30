import { db } from '../../utils/db.js'
import { categorias } from '../../database/schema.js'
import { getUsuarioId } from '../../utils/getUsuario.js'
import { eq, or, isNull } from 'drizzle-orm'

export default defineEventHandler(async () => {
  const usuarioId = await getUsuarioId()
  const result = await db
    .select()
    .from(categorias)
    .where(or(eq(categorias.esPredefinida, true), eq(categorias.usuarioId, usuarioId), isNull(categorias.usuarioId)))
    .orderBy(categorias.nombre)

  return result
})
