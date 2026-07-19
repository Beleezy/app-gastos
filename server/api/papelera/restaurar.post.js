// POST /api/papelera/restaurar — restaura un registro borrado.
// Body: { entidad: 'gasto' | 'deuda', id: uuid }

import { db } from '../../utils/db.js'
import { gastos, deudas, pagosDeuda, personasEntidades } from '../../database/schema.js'
import { getUsuarioFromEvent } from '../../utils/getUsuario.js'
import { eq, and, sql } from 'drizzle-orm'
import { z } from 'zod'

const schema = z.object({
  entidad: z.enum(['gasto', 'deuda']),
  id: z.string().uuid(),
})

export default defineEventHandler(async (event) => {
  const usuarioId = await getUsuarioFromEvent(event)
  const body = await readValidatedBody(event, schema.safeParse)
  if (!body.success) {
    throw createError({ statusCode: 400, message: 'Datos inválidos' })
  }

  const { entidad, id } = body.data

  // Si es un gasto con gastoPlanificadoId, verificar que no haya otro
  // gasto activo vinculado al mismo planificado (el unique parcial sí lo
  // impediría, pero damos un mensaje claro).
  if (entidad === 'gasto') {
    const [g] = await db
      .select({ planId: gastos.gastoPlanificadoId })
      .from(gastos)
      .where(and(eq(gastos.id, id), eq(gastos.usuarioId, usuarioId)))
    if (g?.planId) {
      const [otroActivo] = await db
        .select({ id: gastos.id })
        .from(gastos)
        .where(
          and(
            eq(gastos.gastoPlanificadoId, g.planId),
            sql`${gastos.deletedAt} IS NULL`,
            sql`${gastos.id} != ${id}`,
          ),
        )
        .limit(1)
      if (otroActivo) {
        throw createError({
          statusCode: 409,
          message: 'El gasto planificado ya tiene otro gasto vinculado',
        })
      }
    }
  }

  const restaurado = await db.transaction(async (tx) => {
    if (entidad === 'gasto') {
      const [row] = await tx
        .update(gastos)
        .set({ deletedAt: null })
        .where(
          and(
            eq(gastos.id, id),
            eq(gastos.usuarioId, usuarioId),
            sql`${gastos.deletedAt} IS NOT NULL`,
          ),
        )
        .returning({ id: gastos.id })
      return row || null
    }

    const [antes] = await tx
      .select({ deletedAt: deudas.deletedAt, personaEntidadId: deudas.personaEntidadId })
      .from(deudas)
      .where(
        and(
          eq(deudas.id, id),
          eq(deudas.usuarioId, usuarioId),
          sql`${deudas.deletedAt} IS NOT NULL`,
        ),
      )
      .limit(1)
    if (!antes) return null

    await tx.update(deudas).set({ deletedAt: null }).where(eq(deudas.id, id))

    // Revivir SOLO lo que cayó en la misma cascada de borrado (mismo
    // timestamp): sus pagos — un pago revertido individualmente ya ajustó
    // monto_pendiente y no debe resucitar — y, si "Eliminar persona y sus
    // deudas" se llevó también a la persona, la persona (sin esto la deuda
    // restaurada quedaría huérfana e invisible en la lista).
    await tx
      .update(pagosDeuda)
      .set({ deletedAt: null })
      .where(and(eq(pagosDeuda.deudaId, id), eq(pagosDeuda.deletedAt, antes.deletedAt)))

    if (antes.personaEntidadId) {
      await tx
        .update(personasEntidades)
        .set({ deletedAt: null, updatedAt: new Date() })
        .where(
          and(
            eq(personasEntidades.id, antes.personaEntidadId),
            eq(personasEntidades.usuarioId, usuarioId),
            sql`${personasEntidades.deletedAt} IS NOT NULL`,
          ),
        )
    }

    return { id }
  })

  if (!restaurado) {
    throw createError({ statusCode: 404, message: 'No encontrado en papelera' })
  }

  return { success: true, id: restaurado.id }
})
