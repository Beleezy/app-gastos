import { db } from '../../../utils/db.js'
import { personasEntidades } from '../../../database/schema.js'
import { getUsuarioId } from '../../../utils/getUsuario.js'
import { eq, and } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const body = await readBody(event)
  const usuarioId = await getUsuarioId()

  const updateData = { updatedAt: new Date() }
  if (body.nombre !== undefined) updateData.nombre = body.nombre.trim()
  if (body.tipo !== undefined) updateData.tipo = body.tipo
  if (body.contacto !== undefined) updateData.contacto = body.contacto?.trim() || null
  if (body.notas !== undefined) updateData.notas = body.notas?.trim() || null

  const [updated] = await db
    .update(personasEntidades)
    .set(updateData)
    .where(and(
      eq(personasEntidades.id, id),
      eq(personasEntidades.usuarioId, usuarioId)
    ))
    .returning()

  if (!updated) {
    throw createError({ statusCode: 404, message: 'Persona no encontrada' })
  }

  return updated
})
