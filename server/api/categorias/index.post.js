import { db } from '../../utils/db.js'
import { categorias } from '../../database/schema.js'
import { getUsuarioFromEvent } from '../../utils/getUsuario.js'
import { eq, and } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const usuarioId = await getUsuarioFromEvent(event)
  const body = await readBody(event)

  const { nombre, icono, color } = body

  if (!nombre || !icono || !color) {
    throw createError({ statusCode: 400, message: 'nombre, icono y color son requeridos' })
  }

  // Verificar que no exista ya una categoría con ese nombre para este usuario
  const existe = await db
    .select({ id: categorias.id })
    .from(categorias)
    .where(and(eq(categorias.usuarioId, usuarioId), eq(categorias.nombre, nombre)))
    .limit(1)

  if (existe.length > 0) {
    throw createError({ statusCode: 409, message: 'Ya tienes una categoría con ese nombre' })
  }

  const [nueva] = await db
    .insert(categorias)
    .values({
      usuarioId,
      nombre,
      icono,
      color,
      esPredefinida: false,
    })
    .returning()

  return nueva
})
