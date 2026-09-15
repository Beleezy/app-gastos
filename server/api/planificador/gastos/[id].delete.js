import { db } from '../../../utils/db.js'
import { gastosPlanificados, gastos, planesMensuales } from '../../../database/schema.js'
import { eliminarRecurrentesFuturos } from '../../../utils/recurrente.js'
import { getUsuarioFromEvent } from '../../../utils/getUsuario.js'
import { syncDeleted } from '../../../utils/gcalAutoSync.js'
import { and, eq, isNull } from 'drizzle-orm'
import { getUuidParam } from '../../../utils/params.js'

export default defineEventHandler(async (event) => {
  const id = getUuidParam(event, 'id', { recurso: 'Gasto planificado' })
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

  // El gasto real que se creó al marcarlo como pagado va a la PAPELERA, no
  // a un DELETE físico: es dinero registrado y el usuario puede querer
  // recuperarlo. La FK del planificado es ON DELETE SET NULL, así que el
  // gasto en papelera queda sin vínculo y se restaura como uno suelto.
  // Las dos escrituras van juntas: antes, un fallo entre ambas dejaba el
  // gasto borrado y el planificado vivo.
  await db.transaction(async (tx) => {
    await tx
      .update(gastos)
      .set({ deletedAt: new Date() })
      .where(
        and(
          eq(gastos.gastoPlanificadoId, id),
          eq(gastos.usuarioId, usuarioId),
          isNull(gastos.deletedAt),
        ),
      )
    await tx.delete(gastosPlanificados).where(eq(gastosPlanificados.id, id))
  })

  syncDeleted(usuarioId, gasto.googleEventId, event)
  return { success: true }
})
