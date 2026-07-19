import { db } from '../../../utils/db.js'
import { gastosPlanificados, gastos, planesMensuales } from '../../../database/schema.js'
import { eliminarRecurrentesFuturos } from '../../../utils/recurrente.js'
import { getUsuarioFromEvent } from '../../../utils/getUsuario.js'
import { syncDeleted } from '../../../utils/gcalAutoSync.js'
import { and, eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const usuarioId = await getUsuarioFromEvent(event)
  const query = getQuery(event)
  const eliminarFuturos = query.futuros === 'true'

  // Cargar con JOIN para verificar ownership: gastosPlanificados pertenece
  // al usuario vía planMensualId → planesMensuales.usuarioId. Sin este
  // JOIN un atacante podría borrar gastos de otros usuarios cambiando el
  // UUID en la URL (más el gasto real asociado vía gastoPlanificadoId).
  const [row] = await db
    .select({ gp: gastosPlanificados })
    .from(gastosPlanificados)
    .innerJoin(planesMensuales, eq(planesMensuales.id, gastosPlanificados.planMensualId))
    .where(and(eq(gastosPlanificados.id, id), eq(planesMensuales.usuarioId, usuarioId)))
    .limit(1)
  const gasto = row?.gp

  if (!gasto) {
    // 404 — no 403 — para no filtrar la existencia del recurso ajeno.
    throw createError({ statusCode: 404, message: 'Gasto no encontrado' })
  }

  // If recurring and user wants to delete future ones too
  if (gasto.esRecurrente && gasto.recurrenteGrupoId && eliminarFuturos) {
    await eliminarRecurrentesFuturos(gasto.recurrenteGrupoId, id)
  }

  // Delete associated real expense if exists (ya validamos ownership del
  // planificado; el gasto real está restringido por usuarioId vía la FK).
  await db
    .delete(gastos)
    .where(and(eq(gastos.gastoPlanificadoId, id), eq(gastos.usuarioId, usuarioId)))

  // Delete the current one
  await db.delete(gastosPlanificados).where(eq(gastosPlanificados.id, id))

  syncDeleted(usuarioId, gasto.googleEventId)
  return { success: true }
})
