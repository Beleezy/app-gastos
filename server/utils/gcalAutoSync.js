import { db } from './db.js'
import {
  googleCalendarConexiones,
  gastosPlanificados,
  gastos,
  categorias,
  configuraciones,
} from '../database/schema.js'
import { eq, and } from 'drizzle-orm'
import { decrypt } from './crypto.js'
import { createGcalClient, TokenExpiradoError } from './googleCalendar.js'
import { buildEvent } from './planificadorToGcalEvent.js'
import { logger } from './logger.js'

async function loadContext(usuarioId) {
  const [conexion] = await db
    .select()
    .from(googleCalendarConexiones)
    .where(eq(googleCalendarConexiones.usuarioId, usuarioId))
    .limit(1)
  if (!conexion) return null

  const refreshToken = decrypt(conexion.refreshTokenCifrado)
  const client = createGcalClient({
    refreshToken,
    clientId: process.env.GOOGLE_OAUTH_CLIENT_ID,
    clientSecret: process.env.GOOGLE_OAUTH_CLIENT_SECRET,
  })

  const [cfg] = await db
    .select({ moneda: configuraciones.monedaPreferida })
    .from(configuraciones)
    .where(eq(configuraciones.usuarioId, usuarioId))
    .limit(1)
  const moneda = cfg?.moneda === 'USD' ? 'US$' : cfg?.moneda === 'EUR' ? 'EUR' : 'S/'

  return { conexion, client, moneda }
}

async function setUltimoError(usuarioId, msg) {
  try {
    await db
      .update(googleCalendarConexiones)
      .set({ ultimoError: msg, updatedAt: new Date() })
      .where(eq(googleCalendarConexiones.usuarioId, usuarioId))
  } catch (e) {
    logger.error('[gcal] no se pudo guardar ultimoError', { error: e })
  }
}

async function clearUltimoError(usuarioId) {
  await db
    .update(googleCalendarConexiones)
    .set({ ultimoError: null, ultimaSync: new Date(), updatedAt: new Date() })
    .where(eq(googleCalendarConexiones.usuarioId, usuarioId))
}

async function loadGastoEnriquecido(planificadoId, usuarioId) {
  const [g] = await db
    .select({
      id: gastosPlanificados.id,
      concepto: gastosPlanificados.concepto,
      montoEstimado: gastosPlanificados.montoEstimado,
      fechaProbablePago: gastosPlanificados.fechaProbablePago,
      estado: gastosPlanificados.estado,
      notas: gastosPlanificados.notas,
      googleEventId: gastosPlanificados.googleEventId,
      categoriaNombre: categorias.nombre,
    })
    .from(gastosPlanificados)
    .leftJoin(categorias, eq(gastosPlanificados.categoriaId, categorias.id))
    .where(eq(gastosPlanificados.id, planificadoId))
    .limit(1)
  if (!g) return null

  let real = null
  if (g.estado === 'pagado') {
    const [r] = await db
      .select({ id: gastos.id, fecha: gastos.fecha, monto: gastos.monto })
      .from(gastos)
      .where(and(eq(gastos.gastoPlanificadoId, planificadoId), eq(gastos.usuarioId, usuarioId)))
      .limit(1)
    real = r || null
  }

  return {
    gasto: { ...g, montoEstimado: parseFloat(g.montoEstimado) },
    gastoReal: real ? { ...real, monto: parseFloat(real.monto) } : null,
  }
}

function appUrl() {
  return process.env.APP_PUBLIC_URL || ''
}

// La sincronización corre DESPUÉS de responder para no sumarle a cada
// escritura del planificador la latencia de Google. En serverless eso tiene
// un precio: la plataforma puede congelar la instancia en cuanto sale la
// respuesta, y la promesa suelta muere a medias. `event.waitUntil` (Nitro)
// le pide a la plataforma que espere a que termine; donde no existe, se
// sigue con el fire-and-forget de siempre.
function fireAndForget(usuarioId, label, fn, event) {
  const tarea = Promise.resolve().then(async () => {
    try {
      await fn()
      await clearUltimoError(usuarioId).catch(() => {})
    } catch (err) {
      const msg =
        err instanceof TokenExpiradoError
          ? 'Token expirado, reconecta tu Google Calendar'
          : `${label}: ${err.message || err}`
      // El logger redacta tokens; `console.error(err)` volcaba el cuerpo
      // de la respuesta de Google tal cual.
      logger.error(`[gcal] ${label}`, { usuarioId, error: err })
      await setUltimoError(usuarioId, msg)
    }
  })
  if (typeof event?.waitUntil === 'function') event.waitUntil(tarea)
}

export function syncCreated(usuarioId, planificadoId, event) {
  fireAndForget(
    usuarioId,
    'syncCreated',
    async () => {
      const ctx = await loadContext(usuarioId)
      if (!ctx) return
      const data = await loadGastoEnriquecido(planificadoId, usuarioId)
      if (!data) return
      const payload = buildEvent({
        ...data,
        moneda: ctx.moneda,
        recordatorios: ctx.conexion.recordatoriosConfig,
        appUrl: appUrl(),
      })
      const eventId = await ctx.client.insertEvent(ctx.conexion.calendarId, payload)
      await db
        .update(gastosPlanificados)
        .set({ googleEventId: eventId })
        .where(eq(gastosPlanificados.id, planificadoId))
    },
    event,
  )
}

export function syncUpdated(usuarioId, planificadoId, event) {
  fireAndForget(
    usuarioId,
    'syncUpdated',
    async () => {
      const ctx = await loadContext(usuarioId)
      if (!ctx) return
      const data = await loadGastoEnriquecido(planificadoId, usuarioId)
      if (!data) return
      const payload = buildEvent({
        ...data,
        moneda: ctx.moneda,
        recordatorios: ctx.conexion.recordatoriosConfig,
        appUrl: appUrl(),
      })
      const existingId = data.gasto.googleEventId
      if (!existingId) {
        const eventId = await ctx.client.insertEvent(ctx.conexion.calendarId, payload)
        await db
          .update(gastosPlanificados)
          .set({ googleEventId: eventId })
          .where(eq(gastosPlanificados.id, planificadoId))
      } else {
        const { id: newId, recreated } = await ctx.client.patchEvent(
          ctx.conexion.calendarId,
          existingId,
          payload,
        )
        if (recreated) {
          await db
            .update(gastosPlanificados)
            .set({ googleEventId: newId })
            .where(eq(gastosPlanificados.id, planificadoId))
        }
      }
    },
    event,
  )
}

export function syncDeleted(usuarioId, googleEventId, event) {
  if (!googleEventId) return
  fireAndForget(
    usuarioId,
    'syncDeleted',
    async () => {
      const ctx = await loadContext(usuarioId)
      if (!ctx) return
      await ctx.client.deleteEvent(ctx.conexion.calendarId, googleEventId)
    },
    event,
  )
}
