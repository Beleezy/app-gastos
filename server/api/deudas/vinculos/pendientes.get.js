import { db } from '../../../utils/db.js'
import { solicitudesVinculo, usuarios, personasEntidades } from '../../../database/schema.js'
import { getUsuarioFromEvent } from '../../../utils/getUsuario.js'
import { eq, and } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const usuarioId = await getUsuarioFromEvent(event)
  setHeader(event, 'Cache-Control', 'private, max-age=60, stale-while-revalidate=300')

  // Obtener email del usuario actual
  const [usuario] = await db
    .select({ email: usuarios.email })
    .from(usuarios)
    .where(eq(usuarios.id, usuarioId))
    .limit(1)

  if (!usuario?.email) {
    return []
  }

  const solicitudes = await db
    .select({
      id: solicitudesVinculo.id,
      remitenteId: solicitudesVinculo.remitenteId,
      remitenteNombre: usuarios.nombre,
      remitenteEmail: usuarios.email,
      personaEntidadId: solicitudesVinculo.personaEntidadId,
      personaNombre: personasEntidades.nombre,
      mensaje: solicitudesVinculo.mensaje,
      createdAt: solicitudesVinculo.createdAt,
    })
    .from(solicitudesVinculo)
    .innerJoin(usuarios, eq(usuarios.id, solicitudesVinculo.remitenteId))
    .innerJoin(personasEntidades, eq(personasEntidades.id, solicitudesVinculo.personaEntidadId))
    .where(
      and(
        eq(solicitudesVinculo.destinatarioEmail, usuario.email.toLowerCase()),
        eq(solicitudesVinculo.estado, 'pendiente'),
      ),
    )
    .orderBy(solicitudesVinculo.createdAt)

  return solicitudes
})
