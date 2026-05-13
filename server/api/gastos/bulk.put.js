import { db } from '../../utils/db.js'
import { gastos, categorias } from '../../database/schema.js'
import { getUsuarioFromEvent } from '../../utils/getUsuario.js'
import { rateLimits } from '../../utils/rateLimit.js'
import { eq, and, inArray } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const usuarioId = await getUsuarioFromEvent(event)
  await rateLimits.bulkOp(event, usuarioId)

  if (!Array.isArray(body?.ids) || body.ids.length === 0) {
    throw createError({ statusCode: 400, message: 'Se requiere un array de ids' })
  }

  const ids = body.ids.filter(id => typeof id === 'string' || typeof id === 'number').map(String)
  if (ids.length === 0) {
    throw createError({ statusCode: 400, message: 'Ids inválidos' })
  }
  if (ids.length > 500) {
    throw createError({ statusCode: 400, message: 'Máximo 500 gastos por operación' })
  }

  const campos = body.campos
  if (!campos || typeof campos !== 'object') {
    throw createError({ statusCode: 400, message: 'Se requiere un objeto "campos" con los valores a actualizar' })
  }

  const updateData = { updatedAt: new Date() }
  if (campos.categoriaId !== undefined) updateData.categoriaId = campos.categoriaId
  if (campos.fecha !== undefined) updateData.fecha = campos.fecha
  if (campos.hora !== undefined) updateData.hora = campos.hora
  if (campos.notas !== undefined) updateData.notas = campos.notas || null

  if (Object.keys(updateData).length <= 1) {
    throw createError({ statusCode: 400, message: 'No se proporcionaron campos válidos para actualizar' })
  }

  const actualizados = await db.transaction(async (tx) => {
    const updated = await tx
      .update(gastos)
      .set(updateData)
      .where(and(inArray(gastos.id, ids), eq(gastos.usuarioId, usuarioId)))
      .returning()

    return updated
  })

  // Obtener info de categoría para los actualizados
  const catIds = [...new Set(actualizados.map(g => g.categoriaId).filter(Boolean))]
  const cats = catIds.length > 0
    ? await db.select().from(categorias).where(inArray(categorias.id, catIds))
    : []
  const catMap = Object.fromEntries(cats.map(c => [c.id, c]))

  const resultado = actualizados.map(g => {
    const cat = catMap[g.categoriaId]
    return {
      ...g,
      monto: parseFloat(g.monto),
      categoriaNombre: cat?.nombre,
      categoriaIcono: cat?.icono,
      categoriaColor: cat?.color,
    }
  })

  return { success: true, actualizados: resultado.length, gastos: resultado }
})
