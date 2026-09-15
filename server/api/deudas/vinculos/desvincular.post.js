import { db } from '../../../utils/db.js'
import {
  personasEntidades,
  solicitudesVinculo,
  vinculosCheckpoints,
  auditoriaVinculos,
} from '../../../database/schema.js'
import { getUsuarioFromEvent } from '../../../utils/getUsuario.js'
import { desvincularPersonas, normalizarParPersonas } from '../../../utils/vinculos.js'
import { eq, and, or } from 'drizzle-orm'
import { validateBody } from '../../../utils/validate.js'
import { desvincularSchema } from '~/shared/schemas/deudas.js'

export default defineEventHandler(async (event) => {
  const usuarioId = await getUsuarioFromEvent(event)
  // `personaEntidadId` iba crudo a un `eq()` contra uuid: "abc" devolvía un
  // 500 con la consulta dentro. Un id que no puede existir es un 400.
  const body = await validateBody(event, desvincularSchema)

  // Verificar que la persona pertenece al usuario y está vinculada
  const [persona] = await db
    .select()
    .from(personasEntidades)
    .where(
      and(
        eq(personasEntidades.id, body.personaEntidadId),
        eq(personasEntidades.usuarioId, usuarioId),
      ),
    )
    .limit(1)

  if (!persona) {
    throw createError({ statusCode: 404, message: 'Persona no encontrada' })
  }

  if (!persona.vinculadoUsuarioId || !persona.vinculoParId) {
    throw createError({ statusCode: 400, message: 'Esta persona no tiene un vínculo activo' })
  }

  const personaParId = persona.vinculoParId

  // Obtener persona par para confirmar que existe
  const [personaPar] = await db
    .select({
      id: personasEntidades.id,
      nombre: personasEntidades.nombre,
      usuarioId: personasEntidades.usuarioId,
    })
    .from(personasEntidades)
    .where(eq(personasEntidades.id, personaParId))
    .limit(1)

  const { personaAId: normalizedAId } = normalizarParPersonas(persona.id, personaParId)

  await db.transaction(async (tx) => {
    // Desvincular: quitar referencias en personas, deudas y pagos
    await desvincularPersonas(tx, persona.id, personaParId)

    // Eliminar checkpoints del par (evitar acumulación al revincular)
    await tx.delete(vinculosCheckpoints).where(eq(vinculosCheckpoints.personaAId, normalizedAId))

    // Eliminar auditoría del par (evitar datos sin sentido al revincular)
    await tx
      .delete(auditoriaVinculos)
      .where(
        or(
          and(
            eq(auditoriaVinculos.personaAId, persona.id),
            eq(auditoriaVinculos.personaBId, personaParId),
          ),
          and(
            eq(auditoriaVinculos.personaAId, personaParId),
            eq(auditoriaVinculos.personaBId, persona.id),
          ),
        ),
      )

    // Marcar solicitudes aceptadas entre estos usuarios como 'expirada'
    if (personaPar?.usuarioId) {
      await tx
        .update(solicitudesVinculo)
        .set({ estado: 'expirada', updatedAt: new Date() })
        .where(
          and(
            eq(solicitudesVinculo.estado, 'aceptada'),
            or(
              and(
                eq(solicitudesVinculo.remitenteId, usuarioId),
                eq(solicitudesVinculo.destinatarioId, personaPar.usuarioId),
              ),
              and(
                eq(solicitudesVinculo.remitenteId, personaPar.usuarioId),
                eq(solicitudesVinculo.destinatarioId, usuarioId),
              ),
            ),
          ),
        )
    }
  })

  return {
    ok: true,
    mensaje: 'Vínculo disuelto. Los datos de ambos usuarios se mantienen intactos.',
  }
})
