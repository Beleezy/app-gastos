import { db } from './db.js'
import { configuraciones } from '../database/schema.js'
import { eq } from 'drizzle-orm'

const zonaCache = new Map()
const CACHE_TTL_MS = 5 * 60 * 1000

export async function getZonaHoraria(usuarioId) {
  const cached = zonaCache.get(usuarioId)
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) return cached.tz
  let tz = 'America/Lima'
  try {
    const [cfg] = await db
      .select({ zonaHoraria: configuraciones.zonaHoraria })
      .from(configuraciones)
      .where(eq(configuraciones.usuarioId, usuarioId))
      .limit(1)
    tz = cfg?.zonaHoraria || 'America/Lima'
  } catch (e) {
    // silently fall back
  }
  zonaCache.set(usuarioId, { tz, ts: Date.now() })
  return tz
}

export function fechaHoraEnZona(tz) {
  const ahora = new Date()
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(ahora)
  const get = (t) => parts.find((p) => p.type === t)?.value
  let hora = get('hour')
  if (hora === '24') hora = '00'
  return {
    fecha: `${get('year')}-${get('month')}-${get('day')}`,
    hora: `${hora}:${get('minute')}`,
  }
}

export async function getFechaHoraLocalUsuario(usuarioId) {
  const tz = await getZonaHoraria(usuarioId)
  return fechaHoraEnZona(tz)
}
