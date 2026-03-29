import { db } from '../../../utils/db.js'
import { gastosPlanificados, planesMensuales, categorias } from '../../../database/schema.js'
import { getUsuarioId } from '../../../utils/getUsuario.js'
import { eq, and } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const usuarioId = await getUsuarioId()

  // Verify plan belongs to user
  const [plan] = await db
    .select({ id: planesMensuales.id })
    .from(planesMensuales)
    .where(and(
      eq(planesMensuales.id, body.planMensualId),
      eq(planesMensuales.usuarioId, usuarioId)
    ))
    .limit(1)

  if (!plan) {
    throw createError({ statusCode: 403, message: 'Plan no encontrado' })
  }

  const [gasto] = await db
    .insert(gastosPlanificados)
    .values({
      planMensualId: body.planMensualId,
      categoriaId: body.categoriaId,
      concepto: body.concepto,
      montoEstimado: String(body.montoEstimado),
      fechaProbablePago: body.fechaProbablePago,
      esRecurrente: body.esRecurrente || false,
      notas: body.notas || null,
    })
    .returning()

  // Return with category info
  const [cat] = await db.select().from(categorias).where(eq(categorias.id, gasto.categoriaId)).limit(1)

  return {
    ...gasto,
    montoEstimado: parseFloat(gasto.montoEstimado),
    categoriaNombre: cat?.nombre,
    categoriaIcono: cat?.icono,
    categoriaColor: cat?.color,
  }
})
