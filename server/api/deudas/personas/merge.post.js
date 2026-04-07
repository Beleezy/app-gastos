import { db } from '../../../utils/db.js'
import { personasEntidades, deudas } from '../../../database/schema.js'
import { getUsuarioFromEvent } from '../../../utils/getUsuario.js'
import { eq, and, inArray } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const usuarioId = await getUsuarioFromEvent(event)

  const { personaPrincipalId, personasSecundariasIds } = body

  if (!personaPrincipalId || !Array.isArray(personasSecundariasIds) || personasSecundariasIds.length === 0) {
    throw createError({ statusCode: 400, message: 'Se requiere personaPrincipalId y al menos una persona secundaria' })
  }

  // Verificar que la persona principal pertenece al usuario
  const [principal] = await db
    .select()
    .from(personasEntidades)
    .where(and(eq(personasEntidades.id, personaPrincipalId), eq(personasEntidades.usuarioId, usuarioId)))

  if (!principal) {
    throw createError({ statusCode: 404, message: 'Persona principal no encontrada' })
  }

  // Verificar que todas las secundarias pertenecen al usuario
  const secundarias = await db
    .select()
    .from(personasEntidades)
    .where(and(
      inArray(personasEntidades.id, personasSecundariasIds),
      eq(personasEntidades.usuarioId, usuarioId)
    ))

  if (secundarias.length !== personasSecundariasIds.length) {
    throw createError({ statusCode: 404, message: 'Una o más personas secundarias no encontradas' })
  }

  await db.transaction(async (tx) => {
    // Reasignar todas las deudas de personas secundarias a la persona principal
    for (const id of personasSecundariasIds) {
      await tx
        .update(deudas)
        .set({ personaEntidadId: personaPrincipalId, updatedAt: new Date() })
        .where(and(
          eq(deudas.personaEntidadId, id),
          eq(deudas.usuarioId, usuarioId)
        ))
    }

    // Eliminar personas secundarias (pagos siguen a sus deudas, no a la persona)
    await tx
      .delete(personasEntidades)
      .where(and(
        inArray(personasEntidades.id, personasSecundariasIds),
        eq(personasEntidades.usuarioId, usuarioId)
      ))
  })

  return { ok: true, fusionadas: secundarias.length, principal: principal.nombre }
})
