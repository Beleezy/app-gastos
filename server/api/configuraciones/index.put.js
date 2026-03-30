import { db } from '../../utils/db.js'
import { configuraciones } from '../../database/schema.js'
import { getUsuarioId } from '../../utils/getUsuario.js'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const usuarioId = await getUsuarioId()

  const updateData = {}
  if (body.presupuestoMensualDefault !== undefined) updateData.presupuestoMensualDefault = String(body.presupuestoMensualDefault)
  if (body.monedaPreferida !== undefined) updateData.monedaPreferida = body.monedaPreferida
  if (body.diaInicioCiclo !== undefined) updateData.diaInicioCiclo = body.diaInicioCiclo
  updateData.updatedAt = new Date()

  const [updated] = await db
    .update(configuraciones)
    .set(updateData)
    .where(eq(configuraciones.usuarioId, usuarioId))
    .returning()

  return updated
})
