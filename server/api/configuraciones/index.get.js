import { db } from '../../utils/db.js'
import { configuraciones } from '../../database/schema.js'
import { getUsuarioFromEvent } from '../../utils/getUsuario.js'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const usuarioId = await getUsuarioFromEvent(event)
  const [config] = await db
    .select()
    .from(configuraciones)
    .where(eq(configuraciones.usuarioId, usuarioId))
    .limit(1)

  if (config) return config

  const [newConfig] = await db
    .insert(configuraciones)
    .values({ usuarioId, presupuestoMensualDefault: '3500.00' })
    .returning()

  return newConfig
})
