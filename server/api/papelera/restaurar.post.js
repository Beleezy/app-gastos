// POST /api/papelera/restaurar — restaura un registro borrado.
// Body: { entidad: 'gasto' | 'deuda', id: uuid }

import { db } from '../../utils/db.js'
import { gastos, deudas } from '../../database/schema.js'
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
  const tabla = entidad === 'gasto' ? gastos : deudas

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
        .where(and(
          eq(gastos.gastoPlanificadoId, g.planId),
          sql`${gastos.deletedAt} IS NULL`,
          sql`${gastos.id} != ${id}`,
        ))
        .limit(1)
      if (otroActivo) {
        throw createError({
          statusCode: 409,
          message: 'El gasto planificado ya tiene otro gasto vinculado',
        })
      }
    }
  }

  const [restaurado] = await db
    .update(tabla)
    .set({ deletedAt: null })
    .where(and(
      eq(tabla.id, id),
      eq(tabla.usuarioId, usuarioId),
      sql`${tabla.deletedAt} IS NOT NULL`,
    ))
    .returning({ id: tabla.id })

  if (!restaurado) {
    throw createError({ statusCode: 404, message: 'No encontrado en papelera' })
  }

  return { success: true, id: restaurado.id }
})
