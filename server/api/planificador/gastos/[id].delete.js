import { db } from '../../../utils/db.js'
import { gastosPlanificados } from '../../../database/schema.js'
import { eliminarRecurrentesFuturos } from '../../../utils/recurrente.js'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const query = getQuery(event)
  const eliminarFuturos = query.futuros === 'true'

  // Get the expense to check if it's recurring
  const [gasto] = await db
    .select()
    .from(gastosPlanificados)
    .where(eq(gastosPlanificados.id, id))
    .limit(1)

  if (!gasto) {
    throw createError({ statusCode: 404, message: 'Gasto no encontrado' })
  }

  // If recurring and user wants to delete future ones too
  if (gasto.esRecurrente && gasto.recurrenteGrupoId && eliminarFuturos) {
    await eliminarRecurrentesFuturos(gasto.recurrenteGrupoId, id)
  }

  // Delete the current one
  await db
    .delete(gastosPlanificados)
    .where(eq(gastosPlanificados.id, id))

  return { success: true }
})
