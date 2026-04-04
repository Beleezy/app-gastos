import { db } from '../../../utils/db.js'
import { personasEntidades } from '../../../database/schema.js'
import { getUsuarioId } from '../../../utils/getUsuario.js'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const usuarioId = await getUsuarioId()

  if (!body.nombre?.trim()) {
    throw createError({ statusCode: 400, message: 'El nombre es obligatorio' })
  }

  function capitalizarNombre(nombre) {
    return nombre.trim().replace(/\w\S*/g, w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
  }

  const [persona] = await db
    .insert(personasEntidades)
    .values({
      usuarioId,
      nombre: capitalizarNombre(body.nombre),
      tipo: body.tipo || 'persona',
      contacto: body.contacto?.trim() || null,
      notas: body.notas?.trim() || null,
    })
    .returning()

  return persona
})
