import { db } from '../../utils/db.js'
import { categorias } from '../../database/schema.js'
import { getUsuarioFromEvent } from '../../utils/getUsuario.js'
import { validateBody } from '../../utils/validate.js'
import { categoriaCreateSchema } from '~/shared/schemas/categorias.js'
import { eq, and } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const usuarioId = await getUsuarioFromEvent(event)

  // `categoriaCreateSchema` existía sin usar. Las tres comprobaciones a
  // mano no acotaban longitudes (las columnas son varchar) ni validaban que
  // `color` fuese hex, y una petición SIN cuerpo reventaba en el
  // destructuring con un 500 en vez de un 400.
  const { nombre, icono, color } = await validateBody(event, categoriaCreateSchema)

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
