import { db } from '../../utils/db.js'
import { deudas, personasEntidades, pagosDeuda } from '../../database/schema.js'
import { getUsuarioFromEvent } from '../../utils/getUsuario.js'
import { registrarAuditoria } from '../../utils/vinculos.js'
import { eq, and, isNull } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const usuarioId = await getUsuarioFromEvent(event)

  const [deuda] = await db
    .select()
    .from(deudas)
    .where(and(eq(deudas.id, id), eq(deudas.usuarioId, usuarioId), isNull(deudas.deletedAt)))
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
      await tx
        .update(deudas)
        .set({ vinculoDeudaId: null })
        .where(and(eq(deudas.id, deuda.vinculoDeudaId), isNull(deudas.deletedAt)))
      await tx
        .update(deudas)
        .set({ vinculoDeudaId: null })
        .where(and(eq(deudas.id, id), isNull(deudas.deletedAt)))
      // Cascade soft-delete a pagos asociados de ambas deudas
      const ahora = new Date()
      await tx
        .update(pagosDeuda)
        .set({ deletedAt: ahora })
        .where(and(eq(pagosDeuda.deudaId, deuda.vinculoDeudaId), isNull(pagosDeuda.deletedAt)))
      await tx
        .update(pagosDeuda)
        .set({ deletedAt: ahora })
        .where(and(eq(pagosDeuda.deudaId, id), isNull(pagosDeuda.deletedAt)))
      // Soft-eliminar ambas deudas
      await tx
        .update(deudas)
        .set({ deletedAt: ahora })
        .where(and(eq(deudas.id, deuda.vinculoDeudaId), isNull(deudas.deletedAt)))
      await tx
        .update(deudas)
        .set({ deletedAt: ahora })
        .where(and(eq(deudas.id, id), isNull(deudas.deletedAt)))
    })
  } else {
    await db.transaction(async (tx) => {
      const ahora = new Date()
      // Cascade soft-delete a pagos asociados
      await tx
        .update(pagosDeuda)
        .set({ deletedAt: ahora })
        .where(and(eq(pagosDeuda.deudaId, id), isNull(pagosDeuda.deletedAt)))
      await tx
        .update(deudas)
        .set({ deletedAt: ahora })
        .where(and(eq(deudas.id, id), isNull(deudas.deletedAt)))
    })
  }

  return { success: true }
})
