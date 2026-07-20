import { db } from '../../utils/db.js'
import { categorias, gastos, gastosPlanificados, gastosFuturos } from '../../database/schema.js'
import { getUsuarioFromEvent } from '../../utils/getUsuario.js'
import { eq, and, isNull } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const usuarioId = await getUsuarioFromEvent(event)
  const id = getRouterParam(event, 'id')

  // Solo puede eliminar sus propias categorías (no predefinidas)
  const [cat] = await db
    .select()
    .from(categorias)
    .where(and(eq(categorias.id, id), eq(categorias.usuarioId, usuarioId)))
    .limit(1)

  if (!cat) {
    throw createError({ statusCode: 404, message: 'Categoría no encontrada o es predefinida' })
  }

  // Verificar que no tenga gastos asociados (ignorando soft-deleted)
  const gastosAsociados = await db
    .select({ id: gastos.id })
    .from(gastos)
    .where(and(eq(gastos.categoriaId, id), isNull(gastos.deletedAt)))
    .limit(1)

  if (gastosAsociados.length > 0) {
    throw createError({ statusCode: 409, message: 'No se puede eliminar: tiene gastos asociados' })
  }

  // Verificar que no tenga gastos planificados asociados
  const planificadosAsociados = await db
    .select({ id: gastosPlanificados.id })
    .from(gastosPlanificados)
    .where(eq(gastosPlanificados.categoriaId, id))
    .limit(1)

  if (planificadosAsociados.length > 0) {
    throw createError({
      statusCode: 409,
      message: 'No se puede eliminar: tiene gastos planificados asociados',
    })
  }

  const futurosAsociados = await db
    .select({ id: gastosFuturos.id })
    .from(gastosFuturos)
    .where(eq(gastosFuturos.categoriaId, id))
    .limit(1)

  if (futurosAsociados.length > 0) {
    throw createError({
      statusCode: 409,
      message: 'No se puede eliminar: tiene gastos futuros asociados',
    })
  }

  await db.delete(categorias).where(eq(categorias.id, id))

  return { ok: true }
})
