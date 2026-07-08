import { db } from '../../../utils/db.js'
import { personasEntidades, solicitudesVinculo, deudas, pagosDeuda } from '../../../database/schema.js'
import { getUsuarioFromEvent } from '../../../utils/getUsuario.js'
import { desvincularPersonas, registrarAuditoria, getNombreDisplay } from '../../../utils/vinculos.js'
import { eq, and, or, isNull, inArray } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const usuarioId = await getUsuarioFromEvent(event)

  const [persona] = await db
    .select()
    .from(personasEntidades)
    .where(and(
      eq(personasEntidades.id, id),
      eq(personasEntidades.usuarioId, usuarioId),
      isNull(personasEntidades.deletedAt)
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

  // Soft delete de persona + deudas + pagos, con el MISMO timestamp para que
  // restaurar una deuda desde la papelera pueda revivir en cascada lo que se
  // eliminó junto. Antes esto era un DELETE físico: el cascade purgaba
  // también deudas que ya estaban en la papelera (bug N12).
  const ahora = new Date()
  const eliminada = await db.transaction(async (tx) => {
    const [row] = await tx
      .update(personasEntidades)
      .set({ deletedAt: ahora, updatedAt: ahora })
      .where(and(
        eq(personasEntidades.id, id),
        eq(personasEntidades.usuarioId, usuarioId),
        isNull(personasEntidades.deletedAt)
      ))
      .returning({ id: personasEntidades.id })

    if (!row) return null

    const deudasActivas = await tx
      .update(deudas)
      .set({ deletedAt: ahora })
      .where(and(eq(deudas.personaEntidadId, id), isNull(deudas.deletedAt)))
      .returning({ id: deudas.id })

    if (deudasActivas.length) {
      await tx
        .update(pagosDeuda)
        .set({ deletedAt: ahora })
        .where(and(
          inArray(pagosDeuda.deudaId, deudasActivas.map(d => d.id)),
          isNull(pagosDeuda.deletedAt)
        ))
    }
    return row
  })

  // Alguien la eliminó en paralelo: reportarlo en vez de un 200 sin efecto.
  if (!eliminada) {
    throw createError({ statusCode: 409, message: 'La persona ya fue eliminada' })
  }

  return { success: true }
})
