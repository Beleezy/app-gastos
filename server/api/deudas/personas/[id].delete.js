import { db } from '../../../utils/db.js'
import { personasEntidades, solicitudesVinculo } from '../../../database/schema.js'
import { getUsuarioFromEvent } from '../../../utils/getUsuario.js'
import { desvincularPersonas, registrarAuditoria, getNombreDisplay } from '../../../utils/vinculos.js'
import { eq, and, or } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const usuarioId = await getUsuarioFromEvent(event)

  const [persona] = await db
    .select()
    .from(personasEntidades)
    .where(and(
      eq(personasEntidades.id, id),
      eq(personasEntidades.usuarioId, usuarioId)
    ))
    .limit(1)

  if (!persona) {
    throw createError({ statusCode: 404, message: 'Persona no encontrada' })
  }

  // Si está vinculada, desvincular primero (conserva datos del otro usuario)
  if (persona.vinculadoUsuarioId && persona.vinculoParId) {
    const personaParId = persona.vinculoParId

    // Obtener persona par para auditoría
    const [personaPar] = await db
      .select({ id: personasEntidades.id, nombre: personasEntidades.nombre, usuarioId: personasEntidades.usuarioId })
      .from(personasEntidades)
      .where(eq(personasEntidades.id, personaParId))
      .limit(1)

    const nombreDisplay = await getNombreDisplay(usuarioId)

    await db.transaction(async (tx) => {
      // Registrar auditoría antes de desvincular
      await registrarAuditoria(tx, {
        personaAId: persona.id,
        personaBId: personaParId,
        usuarioId,
        accion: 'vinculo_disuelto',
        descripcion: `${nombreDisplay} eliminó su perfil de "${persona.nombre}". El vínculo se disolvió, los datos del otro usuario se mantienen.`,
        datos: { razon: 'persona_eliminada' },
      })

      // Desvincular: quita referencias pero conserva todos los datos
      await desvincularPersonas(tx, persona.id, personaParId)

      // Marcar solicitudes como expiradas
      if (personaPar?.usuarioId) {
        await tx
          .update(solicitudesVinculo)
          .set({ estado: 'expirada', updatedAt: new Date() })
          .where(and(
            eq(solicitudesVinculo.estado, 'aceptada'),
            or(
              and(
                eq(solicitudesVinculo.remitenteId, usuarioId),
                eq(solicitudesVinculo.destinatarioId, personaPar.usuarioId)
              ),
              and(
                eq(solicitudesVinculo.remitenteId, personaPar.usuarioId),
                eq(solicitudesVinculo.destinatarioId, usuarioId)
              )
            )
          ))
      }
    })
  }

  // DELETE físico: el ON DELETE CASCADE de deudas/pagos se lleva sus registros.
  // N11 (ronda 2): el handler antiguo devolvía siempre 200 aunque no borrara
  // nada. Ahora usamos .returning() y reportamos 409 cuando no se eliminó
  // ninguna fila, para que un no-op no se disfrace de éxito ante el cliente.
  const borradas = await db
    .delete(personasEntidades)
    .where(and(
      eq(personasEntidades.id, id),
      eq(personasEntidades.usuarioId, usuarioId)
    ))
    .returning({ id: personasEntidades.id })

  if (!borradas.length) {
    throw createError({ statusCode: 409, message: 'La persona ya fue eliminada' })
  }

  return { success: true }
})
