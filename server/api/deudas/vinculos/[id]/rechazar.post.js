import { db } from '../../../../utils/db.js'
import { solicitudesVinculo, usuarios } from '../../../../database/schema.js'
import { getUsuarioFromEvent } from '../../../../utils/getUsuario.js'
import { eq, and } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const solicitudId = getRouterParam(event, 'id')
  const usuarioId = await getUsuarioFromEvent(event)

  // Obtener email del usuario
  const [usuario] = await db
    .select({ email: usuarios.email })
    .from(usuarios)
    .where(eq(usuarios.id, usuarioId))
    .limit(1)

  if (!usuario?.email) {
    throw createError({ statusCode: 400, message: 'Tu cuenta no tiene email registrado' })
  }

  const [solicitud] = await db
    .select()
    .from(solicitudesVinculo)
    .where(and(eq(solicitudesVinculo.id, solicitudId), eq(solicitudesVinculo.estado, 'pendiente')))
    .limit(1)

  if (!solicitud) {
    throw createError({ statusCode: 404, message: 'Solicitud no encontrada o ya procesada' })
  }

  if (solicitud.destinatarioEmail.toLowerCase() !== usuario.email.toLowerCase()) {
    throw createError({ statusCode: 403, message: 'Esta solicitud no es para ti' })
  }

  const [actualizada] = await db
    .update(solicitudesVinculo)
    .set({
      estado: 'rechazada',
      destinatarioId: usuarioId,
      updatedAt: new Date(),
    })
    .where(eq(solicitudesVinculo.id, solicitudId))
    .returning()

  return { mensaje: 'Solicitud rechazada', solicitud: actualizada }
})
