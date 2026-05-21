import { db } from '../../utils/db.js'
import { presupuestosCategoria } from '../../database/schema.js'
import { getUsuarioFromEvent } from '../../utils/getUsuario.js'
import { eq, and } from 'drizzle-orm'

// Eliminar por categoriaId (más natural para el cliente que tener que
// recordar el id del registro).
export default defineEventHandler(async (event) => {
  const usuarioId = await getUsuarioFromEvent(event)
  const categoriaId = getRouterParam(event, 'categoriaId')

  const [borrado] = await db
    .delete(presupuestosCategoria)
    .where(and(
      eq(presupuestosCategoria.usuarioId, usuarioId),
      eq(presupuestosCategoria.categoriaId, categoriaId),
    ))
    .returning({ id: presupuestosCategoria.id })

  if (!borrado) throw createError({ statusCode: 404, message: 'Presupuesto no encontrado' })
  return { ok: true, categoriaId }
})
