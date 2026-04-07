import { db } from '../../../utils/db.js'
import { gastosPlanificados, planesMensuales, categorias } from '../../../database/schema.js'
import { getUsuarioFromEvent } from '../../../utils/getUsuario.js'
import { replicarGastoRecurrente, generarGrupoId } from '../../../utils/recurrente.js'
import { eq, and } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const usuarioId = await getUsuarioFromEvent(event)

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

  const esRecurrente = body.esRecurrente || false
  const grupoId = esRecurrente ? generarGrupoId() : null

  const [gasto] = await db
    .insert(gastosPlanificados)
    .values({
      planMensualId: body.planMensualId,
      categoriaId: body.categoriaId,
      concepto: body.concepto,
      montoEstimado: String(body.montoEstimado),
      fechaProbablePago: body.fechaProbablePago,
      esRecurrente,
      recurrenteGrupoId: grupoId,
      notas: body.notas || null,
    })
    .returning()

  // Replicate to future months if recurring
  if (esRecurrente) {
    await replicarGastoRecurrente(usuarioId, {
      categoriaId: body.categoriaId,
      concepto: body.concepto,
      montoEstimado: body.montoEstimado,
      fechaProbablePago: body.fechaProbablePago,
      notas: body.notas || null,
    }, grupoId)
  }

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
