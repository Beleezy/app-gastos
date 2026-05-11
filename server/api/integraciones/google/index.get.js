import { db } from '../../../utils/db.js'
import { googleCalendarConexiones } from '../../../database/schema.js'
import { getUsuarioFromEvent } from '../../../utils/getUsuario.js'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const usuarioId = await getUsuarioFromEvent(event)
  const [conexion] = await db
    .select({
      calendarNombre: googleCalendarConexiones.calendarNombre,
      recordatoriosConfig: googleCalendarConexiones.recordatoriosConfig,
      ultimaSync: googleCalendarConexiones.ultimaSync,
      ultimoError: googleCalendarConexiones.ultimoError,
      fechaConexion: googleCalendarConexiones.fechaConexion,
    })
    .from(googleCalendarConexiones)
    .where(eq(googleCalendarConexiones.usuarioId, usuarioId))
    .limit(1)

  if (!conexion) {
    return { conectado: false }
  }
  return { conectado: true, ...conexion }
})
