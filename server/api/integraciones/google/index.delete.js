import { db } from '../../../utils/db.js'
import { googleCalendarConexiones, gastosPlanificados, planesMensuales } from '../../../database/schema.js'
import { getUsuarioFromEvent } from '../../../utils/getUsuario.js'
import { decrypt } from '../../../utils/crypto.js'
import { createGcalClient } from '../../../utils/googleCalendar.js'
import { eq, inArray } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const usuarioId = await getUsuarioFromEvent(event)
  const query = getQuery(event)
  const borrarCalendario = query.borrarCalendario === 'true'

  const [conexion] = await db.select().from(googleCalendarConexiones)
    .where(eq(googleCalendarConexiones.usuarioId, usuarioId)).limit(1)
  if (!conexion) return { ok: true, sinAccion: true }

  if (borrarCalendario) {
    const config = useRuntimeConfig()
    try {
      const client = createGcalClient({
        refreshToken: decrypt(conexion.refreshTokenCifrado),
        clientId: config.googleOAuthClientId,
        clientSecret: config.googleOAuthClientSecret,
      })
      await client.deleteCalendar(conexion.calendarId)
    } catch (e) {
      // No bloquear desconexion si Google falla - el usuario quiere desconectar
      console.error('[gcal] deleteCalendar fallo', e)
    }
  }

  // Limpiar googleEventId de los planificados del usuario
  const planes = await db.select({ id: planesMensuales.id }).from(planesMensuales)
    .where(eq(planesMensuales.usuarioId, usuarioId))
  if (planes.length) {
    await db.update(gastosPlanificados)
      .set({ googleEventId: null })
      .where(inArray(gastosPlanificados.planMensualId, planes.map(p => p.id)))
  }

  await db.delete(googleCalendarConexiones).where(eq(googleCalendarConexiones.usuarioId, usuarioId))

  return { ok: true }
})
