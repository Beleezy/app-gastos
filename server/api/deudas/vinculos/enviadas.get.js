import { db } from '../../../utils/db.js'
import { solicitudesVinculo, personasEntidades } from '../../../database/schema.js'
import { getUsuarioFromEvent } from '../../../utils/getUsuario.js'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const usuarioId = await getUsuarioFromEvent(event)

  const solicitudes = await db
    .select({
      id: solicitudesVinculo.id,
      destinatarioEmail: solicitudesVinculo.destinatarioEmail,
      personaEntidadId: solicitudesVinculo.personaEntidadId,
      personaNombre: personasEntidades.nombre,
      estado: solicitudesVinculo.estado,
      mensaje: solicitudesVinculo.mensaje,
      createdAt: solicitudesVinculo.createdAt,
      updatedAt: solicitudesVinculo.updatedAt,
    })
    .from(solicitudesVinculo)
    .innerJoin(personasEntidades, eq(personasEntidades.id, solicitudesVinculo.personaEntidadId))
    .where(eq(solicitudesVinculo.remitenteId, usuarioId))
    .orderBy(solicitudesVinculo.createdAt)

  return solicitudes
})
