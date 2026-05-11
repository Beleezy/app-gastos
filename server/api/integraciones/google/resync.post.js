import { db } from '../../../utils/db.js'
import {
  googleCalendarConexiones, gastosPlanificados, planesMensuales,
  categorias, gastos, configuraciones,
} from '../../../database/schema.js'
import { getUsuarioFromEvent } from '../../../utils/getUsuario.js'
import { decrypt } from '../../../utils/crypto.js'
import { createGcalClient, TokenExpiradoError } from '../../../utils/googleCalendar.js'
import { buildEvent } from '../../../utils/planificadorToGcalEvent.js'
import { eq, and, gte, inArray } from 'drizzle-orm'

const CALENDAR_NOMBRE = 'Mis Finanzas - Gastos planificados'

export default defineEventHandler(async (event) => {
  const usuarioId = await getUsuarioFromEvent(event)
  const config = useRuntimeConfig()
  const appUrl = config.appPublicUrl || ''

  const [conexion] = await db
    .select()
    .from(googleCalendarConexiones)
    .where(eq(googleCalendarConexiones.usuarioId, usuarioId))
    .limit(1)
  if (!conexion) {
    throw createError({ statusCode: 400, message: 'No hay conexion con Google Calendar' })
  }

  const client = createGcalClient({
    refreshToken: decrypt(conexion.refreshTokenCifrado),
    clientId: config.googleOAuthClientId,
    clientSecret: config.googleOAuthClientSecret,
  })

  let calendarId = conexion.calendarId

  // Verificar que el calendario sigue existiendo en Google
  let cal
  try {
    cal = await client.getCalendar(calendarId)
  } catch (e) {
    if (e instanceof TokenExpiradoError) {
      await db.update(googleCalendarConexiones)
        .set({ ultimoError: 'Token expirado, reconecta tu Google Calendar', updatedAt: new Date() })
        .where(eq(googleCalendarConexiones.usuarioId, usuarioId))
      throw createError({ statusCode: 401, message: 'Token expirado, reconecta' })
    }
    throw e
  }

  if (!cal) {
    // Calendario borrado en Google → recrear y limpiar event IDs locales
    const nuevo = await client.createCalendar({ summary: CALENDAR_NOMBRE, timeZone: 'America/Lima' })
    calendarId = nuevo.id
    await db.update(googleCalendarConexiones)
      .set({ calendarId, updatedAt: new Date() })
      .where(eq(googleCalendarConexiones.usuarioId, usuarioId))

    const planes = await db.select({ id: planesMensuales.id }).from(planesMensuales)
      .where(eq(planesMensuales.usuarioId, usuarioId))
    if (planes.length) {
      await db.update(gastosPlanificados)
        .set({ googleEventId: null })
        .where(inArray(gastosPlanificados.planMensualId, planes.map(p => p.id)))
    }
  }

  // Moneda preferida
  const [cfg] = await db.select({ moneda: configuraciones.monedaPreferida })
    .from(configuraciones).where(eq(configuraciones.usuarioId, usuarioId)).limit(1)
  const moneda = cfg?.moneda === 'USD' ? 'US$' : cfg?.moneda === 'EUR' ? 'EUR' : 'S/'

  // Cargar planificados desde el primer dia del mes actual
  const hoy = new Date()
  const primerDiaMes = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-01`

  const planificados = await db
    .select({
      id: gastosPlanificados.id,
      concepto: gastosPlanificados.concepto,
      montoEstimado: gastosPlanificados.montoEstimado,
      fechaProbablePago: gastosPlanificados.fechaProbablePago,
      estado: gastosPlanificados.estado,
      notas: gastosPlanificados.notas,
      googleEventId: gastosPlanificados.googleEventId,
      categoriaNombre: categorias.nombre,
      gastoRealId: gastos.id,
      gastoRealFecha: gastos.fecha,
      gastoRealMonto: gastos.monto,
    })
    .from(gastosPlanificados)
    .innerJoin(planesMensuales, eq(gastosPlanificados.planMensualId, planesMensuales.id))
    .leftJoin(categorias, eq(gastosPlanificados.categoriaId, categorias.id))
    .leftJoin(gastos, and(
      eq(gastos.gastoPlanificadoId, gastosPlanificados.id),
      eq(gastos.usuarioId, usuarioId),
    ))
    .where(and(
      eq(planesMensuales.usuarioId, usuarioId),
      gte(gastosPlanificados.fechaProbablePago, primerDiaMes),
    ))

  // Listar eventos actuales de Google (en el rango)
  const eventos = await client.listEvents(calendarId, { timeMin: `${primerDiaMes}T00:00:00Z` })
  const eventosPorId = new Map(eventos.map(e => [e.id, e]))

  let creados = 0, actualizados = 0, eliminados = 0

  for (const p of planificados) {
    const payload = buildEvent({
      gasto: { ...p, montoEstimado: parseFloat(p.montoEstimado) },
      gastoReal: p.gastoRealId
        ? { id: p.gastoRealId, fecha: p.gastoRealFecha, monto: parseFloat(p.gastoRealMonto) }
        : null,
      moneda,
      recordatorios: conexion.recordatoriosConfig,
      appUrl,
    })

    if (p.googleEventId && eventosPorId.has(p.googleEventId)) {
      const { recreated, id: newId } = await client.patchEvent(calendarId, p.googleEventId, payload)
      if (recreated) {
        await db.update(gastosPlanificados).set({ googleEventId: newId }).where(eq(gastosPlanificados.id, p.id))
      }
      eventosPorId.delete(p.googleEventId)
      actualizados++
    } else {
      const newId = await client.insertEvent(calendarId, payload)
      await db.update(gastosPlanificados).set({ googleEventId: newId }).where(eq(gastosPlanificados.id, p.id))
      creados++
    }
  }

  // Eventos huerfanos en Google
  for (const [eventId] of eventosPorId) {
    await client.deleteEvent(calendarId, eventId)
    eliminados++
  }

  await db.update(googleCalendarConexiones)
    .set({ ultimaSync: new Date(), ultimoError: null, updatedAt: new Date() })
    .where(eq(googleCalendarConexiones.usuarioId, usuarioId))

  return { creados, actualizados, eliminados }
})
