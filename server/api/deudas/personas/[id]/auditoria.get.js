import { db } from '../../../../utils/db.js'
import { auditoriaVinculos, personasEntidades, usuarios } from '../../../../database/schema.js'
import { getUsuarioFromEvent } from '../../../../utils/getUsuario.js'
import { eq, and, or, desc } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const personaId = getRouterParam(event, 'id')
  const usuarioId = await getUsuarioFromEvent(event)

  // Verificar que la persona pertenece al usuario
  const [persona] = await db
    .select({ id: personasEntidades.id, vinculoParId: personasEntidades.vinculoParId })
    .from(personasEntidades)
    .where(and(
      eq(personasEntidades.id, personaId),
      eq(personasEntidades.usuarioId, usuarioId)
    ))
    .limit(1)

  if (!persona) {
    throw createError({ statusCode: 404, message: 'Persona no encontrada' })
  }

  // Obtener entradas de auditoría donde esta persona es parte A o parte B
  const entradas = await db
    .select({
      id: auditoriaVinculos.id,
      accion: auditoriaVinculos.accion,
      descripcion: auditoriaVinculos.descripcion,
      datos: auditoriaVinculos.datos,
      createdAt: auditoriaVinculos.createdAt,
      usuarioId: auditoriaVinculos.usuarioId,
      nombreUsuario: usuarios.nombre,
    })
    .from(auditoriaVinculos)
    .innerJoin(usuarios, eq(auditoriaVinculos.usuarioId, usuarios.id))
    .where(
      or(
        eq(auditoriaVinculos.personaAId, personaId),
        eq(auditoriaVinculos.personaBId, personaId)
      )
    )
    .orderBy(desc(auditoriaVinculos.createdAt))
    .limit(100)

  return entradas.map(e => ({
    ...e,
    datos: e.datos ? JSON.parse(e.datos) : null,
    esMiAccion: e.usuarioId === usuarioId,
  }))
})
