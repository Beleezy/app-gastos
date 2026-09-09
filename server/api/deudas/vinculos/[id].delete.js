import { db } from '../../../utils/db.js'
import { solicitudesVinculo } from '../../../database/schema.js'
import { getUsuarioFromEvent } from '../../../utils/getUsuario.js'
import { eq, and } from 'drizzle-orm'
import { getUuidParam } from '../../../utils/params.js'

export default defineEventHandler(async (event) => {
  const solicitudId = getUuidParam(event, 'id', { recurso: 'Solicitud' })
  const usuarioId = await getUsuarioFromEvent(event)

  const [solicitud] = await db
    .select()
    .from(solicitudesVinculo)
    .where(
      and(
        eq(solicitudesVinculo.id, solicitudId),
        eq(solicitudesVinculo.remitenteId, usuarioId),
        eq(solicitudesVinculo.estado, 'pendiente'),
      ),
    )
    .limit(1)

  if (!solicitud) {
    throw createError({
      statusCode: 404,
      message: 'Solicitud no encontrada o no se puede cancelar',
    })
  }

  await db.delete(solicitudesVinculo).where(eq(solicitudesVinculo.id, solicitudId))

  return { mensaje: 'Solicitud cancelada' }
})
