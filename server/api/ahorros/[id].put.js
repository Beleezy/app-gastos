import { db } from '../../utils/db.js'
import { ahorros, mediosAhorro } from '../../database/schema.js'
import { getUsuarioFromEvent } from '../../utils/getUsuario.js'
import { eq, and } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const body = await readBody(event)
  const usuarioId = await getUsuarioFromEvent(event)

  const updateData = { updatedAt: new Date() }
  if (body.concepto !== undefined) updateData.concepto = body.concepto?.trim() || null
  if (body.monto !== undefined) updateData.monto = String(body.monto)
  if (body.medioAhorroId !== undefined) updateData.medioAhorroId = body.medioAhorroId || null
  if (body.notas !== undefined) updateData.notas = body.notas?.trim() || null

  if (body.fecha !== undefined) {
    updateData.fecha = body.fecha
    const fechaObj = new Date(body.fecha + 'T00:00:00')
    updateData.mes = fechaObj.getMonth() + 1
    updateData.anio = fechaObj.getFullYear()
  }

  const [updated] = await db
    .update(ahorros)
    .set(updateData)
    .where(and(eq(ahorros.id, id), eq(ahorros.usuarioId, usuarioId)))
    .returning()

  if (!updated) {
    throw createError({ statusCode: 404, message: 'Ahorro no encontrado' })
  }

  let medio = null
  if (updated.medioAhorroId) {
    ;[medio] = await db.select().from(mediosAhorro).where(eq(mediosAhorro.id, updated.medioAhorroId)).limit(1)
  }

  return {
    ...updated,
    monto: parseFloat(updated.monto),
    medioNombre: medio?.nombre || null,
    medioIcono: medio?.icono || null,
    medioColor: medio?.color || null,
  }
})
