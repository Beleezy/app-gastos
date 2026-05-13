import { db } from '../../../utils/db.js'
import { mediosAhorro } from '../../../database/schema.js'
import { getUsuarioFromEvent } from '../../../utils/getUsuario.js'
import { validateBody } from '../../../utils/validate.js'
import { medioAhorroUpdateSchema } from '~/shared/schemas/categorias.js'
import { eq, and } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const usuarioId = await getUsuarioFromEvent(event)
  const body = await validateBody(event, medioAhorroUpdateSchema)

  const updateData = {}
  if (body.nombre !== undefined) updateData.nombre = body.nombre.trim()
  if (body.tipo !== undefined) updateData.tipo = body.tipo
  if (body.icono !== undefined) updateData.icono = body.icono
  if (body.color !== undefined) updateData.color = body.color
  if (body.orden !== undefined) updateData.orden = body.orden
  if (body.activo !== undefined) updateData.activo = body.activo

  const [updated] = await db
    .update(mediosAhorro)
    .set(updateData)
    .where(and(eq(mediosAhorro.id, id), eq(mediosAhorro.usuarioId, usuarioId)))
    .returning()

  if (!updated) {
    throw createError({ statusCode: 404, message: 'Medio no encontrado' })
  }

  return updated
})
