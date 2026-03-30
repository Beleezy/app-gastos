import { db } from '../../utils/db.js'
import { gastos, categorias } from '../../database/schema.js'
import { getUsuarioId } from '../../utils/getUsuario.js'
import { eq, and } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const body = await readBody(event)
  const usuarioId = await getUsuarioId()

  const updateData = { updatedAt: new Date() }

  if (body.concepto !== undefined) updateData.concepto = body.concepto.trim()
  if (body.monto !== undefined) updateData.monto = String(body.monto)
  if (body.categoriaId !== undefined) updateData.categoriaId = body.categoriaId
  if (body.fecha !== undefined) updateData.fecha = body.fecha
  if (body.hora !== undefined) updateData.hora = body.hora
  if (body.notas !== undefined) updateData.notas = body.notas || null

  const [updated] = await db
    .update(gastos)
    .set(updateData)
    .where(and(eq(gastos.id, id), eq(gastos.usuarioId, usuarioId)))
    .returning()

  if (!updated) {
    throw createError({ statusCode: 404, message: 'Gasto no encontrado' })
  }

  const [cat] = await db.select().from(categorias).where(eq(categorias.id, updated.categoriaId)).limit(1)

  return {
    ...updated,
    monto: parseFloat(updated.monto),
    categoriaNombre: cat?.nombre,
    categoriaIcono: cat?.icono,
    categoriaColor: cat?.color,
  }
})
