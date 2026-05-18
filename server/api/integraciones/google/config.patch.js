import { db } from '../../../utils/db.js'
import { googleCalendarConexiones, gastosPlanificados, planesMensuales } from '../../../database/schema.js'
import { getUsuarioFromEvent } from '../../../utils/getUsuario.js'
import { decrypt } from '../../../utils/crypto.js'
import { createGcalClient } from '../../../utils/googleCalendar.js'
import { logger } from '../../../utils/logger.js'
import { recordatorioToMinutes } from '../../../utils/planificadorToGcalEvent.js'
import { eq, and, isNotNull } from 'drizzle-orm'

const TIPOS = new Set(['mismo_dia', 'dia_anterior', 'dos_dias_antes', 'una_semana_antes'])

function validar(recordatorios) {
  if (!Array.isArray(recordatorios)) {
    throw createError({ statusCode: 400, message: 'recordatorios debe ser un array' })
  }
  if (recordatorios.length > 5) {
    throw createError({ statusCode: 400, message: 'Maximo 5 recordatorios' })
  }
  for (const r of recordatorios) {
    if (!TIPOS.has(r.tipo)) {
      throw createError({ statusCode: 400, message: `tipo invalido: ${r.tipo}` })
    }
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(r.hora || '')) {
      throw createError({ statusCode: 400, message: `hora invalida: ${r.hora}` })
    }
  }
}

export default defineEventHandler(async (event) => {
  const usuarioId = await getUsuarioFromEvent(event)
  const body = await readBody(event)
  validar(body.recordatorios)

  const [conexion] = await db.select().from(googleCalendarConexiones)
    .where(eq(googleCalendarConexiones.usuarioId, usuarioId)).limit(1)
  if (!conexion) {
    throw createError({ statusCode: 400, message: 'No hay conexion' })
  }

  await db.update(googleCalendarConexiones)
    .set({ recordatoriosConfig: body.recordatorios, updatedAt: new Date() })
    .where(eq(googleCalendarConexiones.usuarioId, usuarioId))

  // Cargar planificados pendientes con event ID
  const pendientes = await db
    .select({
      id: gastosPlanificados.id,
      googleEventId: gastosPlanificados.googleEventId,
    })
    .from(gastosPlanificados)
    .innerJoin(planesMensuales, eq(gastosPlanificados.planMensualId, planesMensuales.id))
    .where(and(
      eq(planesMensuales.usuarioId, usuarioId),
      eq(gastosPlanificados.estado, 'pendiente'),
      isNotNull(gastosPlanificados.googleEventId),
    ))

  const config = useRuntimeConfig()
  const client = createGcalClient({
    refreshToken: decrypt(conexion.refreshTokenCifrado),
    clientId: config.googleOAuthClientId,
    clientSecret: config.googleOAuthClientSecret,
  })

  const overrides = body.recordatorios.map(r => ({ method: 'popup', minutes: recordatorioToMinutes(r) }))
  let actualizados = 0
  for (const p of pendientes) {
    try {
      await client.patchEvent(conexion.calendarId, p.googleEventId, {
        reminders: { useDefault: false, overrides },
      })
      actualizados++
    } catch (e) {
      logger.error('gcal_config_patch', { gastoPlanificadoId: p.id, error: e })
    }
  }

  return { ok: true, actualizados }
})
