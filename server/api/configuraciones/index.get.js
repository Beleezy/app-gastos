import { db } from '../../utils/db.js'
import { configuraciones } from '../../database/schema.js'
import { getUsuarioFromEvent } from '../../utils/getUsuario.js'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const usuarioId = await getUsuarioFromEvent(event)

  // La configuración del usuario cambia rara vez. Permitimos cache cliente
  // y SW por 5 min con SWR para evitar re-fetch en cada arranque.
  setHeader(event, 'Cache-Control', 'private, max-age=300, stale-while-revalidate=600')

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
