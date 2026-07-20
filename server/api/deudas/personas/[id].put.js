import { db } from '../../../utils/db.js'
import { personasEntidades } from '../../../database/schema.js'
import { getUsuarioFromEvent } from '../../../utils/getUsuario.js'
import { validateBody } from '../../../utils/validate.js'
import { personaEntidadUpdateSchema } from '~/shared/schemas/deudas.js'
import { eq, and } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const usuarioId = await getUsuarioFromEvent(event)
  // Whitelist + tipos via Zod. `tipo` queda restringido al enum real
  // de DB (persona | organizacion). Sin esto, un atacante podría
  // intentar persistir tipos inválidos que rompan queries downstream.
  const body = await validateBody(event, personaEntidadUpdateSchema)

  function capitalizarNombre(nombre) {
    return nombre
      .trim()
      .replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
  }

  const updateData = { updatedAt: new Date() }
  if (body.nombre !== undefined) updateData.nombre = capitalizarNombre(body.nombre)
  if (body.tipo !== undefined) updateData.tipo = body.tipo
  if (body.contacto !== undefined) updateData.contacto = body.contacto?.trim() || null
  if (body.notas !== undefined) updateData.notas = body.notas?.trim() || null

  const [updated] = await db
    .update(personasEntidades)
    .set(updateData)
    .where(and(eq(personasEntidades.id, id), eq(personasEntidades.usuarioId, usuarioId)))
    .returning()

  if (!updated) {
    throw createError({ statusCode: 404, message: 'Persona no encontrada' })
  }

  return updated
})
