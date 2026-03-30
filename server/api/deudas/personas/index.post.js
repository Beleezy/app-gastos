import { db } from '../../../utils/db.js'
import { personasEntidades } from '../../../database/schema.js'
import { getUsuarioId } from '../../../utils/getUsuario.js'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const usuarioId = await getUsuarioId()

  if (!body.nombre?.trim()) {
    throw createError({ statusCode: 400, message: 'El nombre es obligatorio' })
  }

  const [persona] = await db
    .insert(personasEntidades)
    .values({
      usuarioId,
      nombre: body.nombre.trim(),
      tipo: body.tipo || 'persona',
      contacto: body.contacto?.trim() || null,
      notas: body.notas?.trim() || null,
    })
    .returning()

  return persona
})
