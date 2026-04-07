import { db } from '../../utils/db.js'
import { configuraciones } from '../../database/schema.js'
import { getUsuarioFromEvent } from '../../utils/getUsuario.js'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const usuarioId = await getUsuarioFromEvent(event)

  const updateData = {}
  if (body.nombre !== undefined) updateData.nombre = String(body.nombre).slice(0, 100)
  if (body.presupuestoMensualDefault !== undefined) updateData.presupuestoMensualDefault = String(body.presupuestoMensualDefault)
  if (body.monedaPreferida !== undefined) updateData.monedaPreferida = body.monedaPreferida
  if (body.diaInicioCiclo !== undefined) updateData.diaInicioCiclo = body.diaInicioCiclo
  if (body.zonaHoraria !== undefined) updateData.zonaHoraria = String(body.zonaHoraria).slice(0, 50)
  if (body.locale !== undefined) updateData.locale = String(body.locale).slice(0, 10)
  updateData.updatedAt = new Date()

  const [updated] = await db
    .update(configuraciones)
    .set(updateData)
    .where(eq(configuraciones.usuarioId, usuarioId))
    .returning()

  return updated
})
