import { db } from '../../../utils/db.js'
import { gastosPlanificados, categorias } from '../../../database/schema.js'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const body = await readBody(event)

  const updateData = { updatedAt: new Date() }
  if (body.concepto !== undefined) updateData.concepto = body.concepto
  if (body.montoEstimado !== undefined) updateData.montoEstimado = String(body.montoEstimado)
  if (body.categoriaId !== undefined) updateData.categoriaId = body.categoriaId
  if (body.fechaProbablePago !== undefined) updateData.fechaProbablePago = body.fechaProbablePago
  if (body.esRecurrente !== undefined) updateData.esRecurrente = body.esRecurrente
  if (body.estado !== undefined) updateData.estado = body.estado
  if (body.notas !== undefined) updateData.notas = body.notas

  const [updated] = await db
    .update(gastosPlanificados)
    .set(updateData)
    .where(eq(gastosPlanificados.id, id))
    .returning()

  if (!updated) {
    throw createError({ statusCode: 404, message: 'Gasto planificado no encontrado' })
  }

  const [cat] = await db.select().from(categorias).where(eq(categorias.id, updated.categoriaId)).limit(1)

  return {
    ...updated,
    montoEstimado: parseFloat(updated.montoEstimado),
    categoriaNombre: cat?.nombre,
    categoriaIcono: cat?.icono,
    categoriaColor: cat?.color,
  }
})
