import { db } from '../../utils/db.js'
import { gastos, categorias } from '../../database/schema.js'
import { getUsuarioFromEvent } from '../../utils/getUsuario.js'
import { rateLimits } from '../../utils/rateLimit.js'
import { validateBody } from '../../utils/validate.js'
import { assertCategoriasPropias } from '../../utils/categorias.js'
import { gastosBulkUpdateSchema } from '~/shared/schemas/gastos.js'
import { eq, and, inArray, isNull } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const usuarioId = await getUsuarioFromEvent(event)
  await rateLimits.bulkOp(event, usuarioId)

  // Antes esto era una cadena de `if` sobre el body crudo: validaba la
  // forma pero no el CONTENIDO, así que `fecha: "el martes"` o un
  // categoriaId no-UUID llegaban a Postgres y salían como 500 del driver.
  const body = await validateBody(event, gastosBulkUpdateSchema)

  const ids = body.ids.map(String)
  const campos = body.campos

  // Reasignar en lote a una categoría ajena era la vía más cómoda para el
  // mismo IDOR que POST /api/gastos: un solo PUT movía todos los gastos.
  if (campos.categoriaId !== undefined && campos.categoriaId !== null) {
    await assertCategoriasPropias({ usuarioId, categoriaIds: [campos.categoriaId] })
  }

  const updateData = { updatedAt: new Date() }
  if (campos.categoriaId !== undefined) updateData.categoriaId = campos.categoriaId
  if (campos.fecha !== undefined) updateData.fecha = campos.fecha
  if (campos.hora !== undefined) updateData.hora = campos.hora
  if (campos.notas !== undefined) updateData.notas = campos.notas || null
  // Módulo Compartido: marcar/desmarcar varios gastos de una vez.
  if (campos.visibilidad !== undefined) updateData.visibilidad = campos.visibilidad

  const actualizados = await db.transaction(async (tx) => {
    const updated = await tx
      .update(gastos)
      .set(updateData)
      .where(
        and(inArray(gastos.id, ids), eq(gastos.usuarioId, usuarioId), isNull(gastos.deletedAt)),
      )
      .returning()

    return updated
  })

  // Obtener info de categoría para los actualizados
  const catIds = [...new Set(actualizados.map((g) => g.categoriaId).filter(Boolean))]
  const cats =
    catIds.length > 0
      ? await db.select().from(categorias).where(inArray(categorias.id, catIds))
      : []
  const catMap = Object.fromEntries(cats.map((c) => [c.id, c]))

  const resultado = actualizados.map((g) => {
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
