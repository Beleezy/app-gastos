import { db } from '../../../utils/db.js'
import { googleCalendarConexiones, gastosPlanificados, planesMensuales } from '../../../database/schema.js'
import { verifyState } from '../../../utils/googleOAuthState.js'
import { encrypt } from '../../../utils/crypto.js'
import { createGcalClient } from '../../../utils/googleCalendar.js'
import { eq, inArray } from 'drizzle-orm'

const TOKEN_URL = 'https://oauth2.googleapis.com/token'
const CALENDAR_NOMBRE = 'Mis Finanzas - Gastos planificados'
const DEFAULT_RECORDATORIOS = [
  { tipo: 'dia_anterior', hora: '18:00' },
  { tipo: 'mismo_dia', hora: '09:00' },
]

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const code = query.code
  const stateToken = query.state
  if (!code || !stateToken) {
    return sendRedirect(event, '/configuraciones?gcal=error&motivo=missing_code')
  }

  let usuarioId
  try {
    const claims = verifyState(stateToken)
    usuarioId = claims.usuarioId
  } catch {
    return sendRedirect(event, '/configuraciones?gcal=error&motivo=state_invalido')
  }

  const config = useRuntimeConfig()

  // Intercambiar code por tokens
  let tokens
  try {
    const tokenRes = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: config.googleOAuthClientId,
        client_secret: config.googleOAuthClientSecret,
        redirect_uri: config.googleOAuthRedirectUri,
        grant_type: 'authorization_code',
      }).toString(),
    })
    tokens = await tokenRes.json()
  } catch (e) {
    console.error('[gcal] token exchange fallo', e)
    return sendRedirect(event, '/configuraciones?gcal=error&motivo=token_exchange')
  }

  if (!tokens.refresh_token) {
    return sendRedirect(event, '/configuraciones?gcal=error&motivo=sin_refresh_token')
  }

  // Crear calendario dedicado
  let calendar
  try {
    const client = createGcalClient({
      refreshToken: tokens.refresh_token,
      clientId: config.googleOAuthClientId,
      clientSecret: config.googleOAuthClientSecret,
    })
    calendar = await client.createCalendar({ summary: CALENDAR_NOMBRE, timeZone: 'America/Lima' })
  } catch (e) {
    console.error('[gcal] createCalendar fallo', e)
    return sendRedirect(event, '/configuraciones?gcal=error&motivo=crear_calendario')
  }

  // Persistir conexion (upsert via delete + insert)
  const refreshCifrado = encrypt(tokens.refresh_token)
  await db.delete(googleCalendarConexiones).where(eq(googleCalendarConexiones.usuarioId, usuarioId))
  await db.insert(googleCalendarConexiones).values({
    usuarioId,
    refreshTokenCifrado: refreshCifrado,
    calendarId: calendar.id,
    calendarNombre: CALENDAR_NOMBRE,
    recordatoriosConfig: DEFAULT_RECORDATORIOS,
    ultimaSync: new Date(),
  })

  // Limpiar googleEventId obsoletos (en caso de reconexion)
  const planes = await db.select({ id: planesMensuales.id }).from(planesMensuales)
    .where(eq(planesMensuales.usuarioId, usuarioId))
  if (planes.length) {
    await db.update(gastosPlanificados)
      .set({ googleEventId: null })
      .where(inArray(gastosPlanificados.planMensualId, planes.map(p => p.id)))
  }

  return sendRedirect(event, '/configuraciones?gcal=conectado')
})
