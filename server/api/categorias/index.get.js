import { db } from '../../utils/db.js'
import { categorias } from '../../database/schema.js'
import { getUsuarioFromEvent } from '../../utils/getUsuario.js'
import { eq, or, and, isNull } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const usuarioId = await getUsuarioFromEvent(event)

  // Cache-Control: las categorías cambian rara vez. El cliente puede
  // confiar en una caché de 5 min con SWR para no re-fetchear en cada
  // navegación. Workbox NetworkFirst para `/api/categorias` lo aprovecha.
  setHeader(event, 'Cache-Control', 'private, max-age=300, stale-while-revalidate=600')

  // Una sola consulta que trae las del usuario + predefinidas. Si el
  // usuario ya tiene categorías propias (provisionado), devolvemos solo
  // esas; si no, devolvemos las predefinidas globales.
  const cats = await db
    .select()
    .from(categorias)
    .where(or(
      eq(categorias.usuarioId, usuarioId),
      and(eq(categorias.esPredefinida, true), isNull(categorias.usuarioId)),
    ))
    .orderBy(categorias.nombre)

  const propias = cats.filter(c => c.usuarioId === usuarioId)
  return propias.length > 0 ? propias : cats
})
