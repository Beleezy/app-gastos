import { db } from '../../utils/db.js'
import { planesMensuales } from '../../database/schema.js'
import { getUsuarioFromEvent } from '../../utils/getUsuario.js'
import { eq, and } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const usuarioId = await getUsuarioFromEvent(event)

  const [updated] = await db
    .update(planesMensuales)
    .set({
      montoPresupuesto: String(body.montoPresupuesto),
      updatedAt: new Date(),
    })
    .where(and(eq(planesMensuales.id, body.id), eq(planesMensuales.usuarioId, usuarioId)))
    .returning()

  return { ...updated, montoPresupuesto: parseFloat(updated.montoPresupuesto) }
})
