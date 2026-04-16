import { db } from '../../../utils/db.js'
import { mediosAhorro } from '../../../database/schema.js'
import { getUsuarioFromEvent } from '../../../utils/getUsuario.js'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const usuarioId = await getUsuarioFromEvent(event)

  if (!body.nombre?.trim()) {
    throw createError({ statusCode: 400, message: 'El nombre es obligatorio' })
  }

  const [medio] = await db
    .insert(mediosAhorro)
    .values({
      usuarioId,
      nombre: body.nombre.trim(),
      tipo: body.tipo || 'otro',
      icono: body.icono || '💰',
      color: body.color || '#6B7280',
      orden: body.orden ?? 0,
    })
    .returning()

  return medio
})
