import { db } from '../../../utils/db.js'
import { gastosPlanificados } from '../../../database/schema.js'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')

  await db
    .delete(gastosPlanificados)
    .where(eq(gastosPlanificados.id, id))

  return { success: true }
})
