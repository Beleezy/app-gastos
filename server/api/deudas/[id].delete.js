import { db } from '../../utils/db.js'
import { deudas, personasEntidades } from '../../database/schema.js'
import { getUsuarioFromEvent } from '../../utils/getUsuario.js'
import { registrarAuditoria } from '../../utils/vinculos.js'
import { eq, and } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const usuarioId = await getUsuarioFromEvent(event)

  const [deuda] = await db
    .select()
    .from(deudas)
    .where(and(eq(deudas.id, id), eq(deudas.usuarioId, usuarioId)))
    .limit(1)

  if (!deuda) {
    throw createError({ statusCode: 404, message: 'Deuda no encontrada' })
  }

  if (deuda.vinculoDeudaId) {
    // Obtener persona para auditoría
    const [persona] = await db
      .select({ id: personasEntidades.id, vinculoParId: personasEntidades.vinculoParId })
      .from(personasEntidades)
      .where(eq(personasEntidades.id, deuda.personaEntidadId))
      .limit(1)

    await db.transaction(async (tx) => {
      // Registrar auditoría antes de eliminar
      if (persona?.vinculoParId) {
        await registrarAuditoria(tx, {
          personaAId: deuda.personaEntidadId,
          personaBId: persona.vinculoParId,
          usuarioId,
          accion: 'deuda_eliminada',
          descripcion: `Deuda eliminada: "${deuda.concepto}" (S/ ${parseFloat(deuda.montoOriginal)})`,
          datos: { deudaId: id, concepto: deuda.concepto, montoOriginal: deuda.montoOriginal },
        })
      }

      // Desvincular ambos lados primero para evitar FK circular
      await tx.update(deudas).set({ vinculoDeudaId: null }).where(eq(deudas.id, deuda.vinculoDeudaId))
      await tx.update(deudas).set({ vinculoDeudaId: null }).where(eq(deudas.id, id))
      // Eliminar ambas
      await tx.delete(deudas).where(eq(deudas.id, deuda.vinculoDeudaId))
      await tx.delete(deudas).where(eq(deudas.id, id))
    })
  } else {
    await db.delete(deudas).where(eq(deudas.id, id))
  }

  return { success: true }
})
