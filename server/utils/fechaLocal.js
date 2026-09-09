import { db } from './db.js'
import { configuraciones } from '../database/schema.js'
import { eq } from 'drizzle-orm'

const CACHE_TTL_MS = 5 * 60 * 1000
const ZONA_DEFECTO = 'America/Lima'

// Cota del cache de zonas horarias. Es un Map de proceso que antes crecía
// sin límite: en una instancia de larga vida acumula una entrada por
// usuario que haya escrito algo, y nunca la suelta. El tope convierte una
// fuga lenta en un cache LRU-ish (se descarta lo más viejo por orden de
// inserción, que es el orden natural de un Map).
const MAX_ZONAS = 500
const zonaCache = new Map()

// `new Intl.DateTimeFormat(...)` es caro de construir —decenas de µs, a
// veces más en el primer uso de una zona— y antes se construía uno nuevo
// en CADA llamada. `getFechaHoraLocalUsuario` corre en casi toda escritura
// (crear gasto, deuda, pago, ingreso, bulk…), así que era coste fijo por
// request. Los formateadores son inmutables y reutilizables: se cachean
// por zona horaria. El conjunto de zonas es pequeño y acotado por los
// usuarios reales, pero se le pone tope por la misma razón que arriba.
const MAX_FORMATTERS = 100
const formatterCache = new Map()

function acotar(mapa, max) {
  while (mapa.size > max) {
    const primera = mapa.keys().next()
    if (primera.done) break
    mapa.delete(primera.value)
  }
}

export async function getZonaHoraria(usuarioId) {
  const cached = zonaCache.get(usuarioId)
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) return cached.tz
  let tz = ZONA_DEFECTO
  try {
    const [cfg] = await db
      .select({ zonaHoraria: configuraciones.zonaHoraria })
      .from(configuraciones)
      .where(eq(configuraciones.usuarioId, usuarioId))
      .limit(1)
    tz = cfg?.zonaHoraria || ZONA_DEFECTO
  } catch {
    // silently fall back
  }
  zonaCache.set(usuarioId, { tz, ts: Date.now() })
  acotar(zonaCache, MAX_ZONAS)
  return tz
}

const OPCIONES_FORMATO = {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
}

function getFormatter(tz) {
  const cacheado = formatterCache.get(tz)
  if (cacheado) return cacheado

  let fmt
  try {
    fmt = new Intl.DateTimeFormat('en-CA', { ...OPCIONES_FORMATO, timeZone: tz })
  } catch {
    // Zona inválida guardada en configuraciones (dato viejo, typo, o una
    // zona que este runtime no conoce): `new Intl.DateTimeFormat` lanza
    // RangeError, y ese throw abortaba el guardado del gasto entero.
    //
    // Se cae a la zona por defecto del proyecto y, si ni esa existe (ICU
    // recortado), a la del sistema sin `timeZone` — que siempre construye.
    // La cadena termina: nunca devuelve null, porque quien llama encadena
    // `.formatToParts` directamente.
    fmt =
      tz === ZONA_DEFECTO
        ? new Intl.DateTimeFormat('en-CA', OPCIONES_FORMATO)
        : getFormatter(ZONA_DEFECTO)
  }

  formatterCache.set(tz, fmt)
  acotar(formatterCache, MAX_FORMATTERS)
  return fmt
}

export function fechaHoraEnZona(tz) {
  const parts = getFormatter(tz).formatToParts(new Date())
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

// Para tests: vaciar los caches entre casos.
export function __resetFechaLocalCaches() {
  zonaCache.clear()
  formatterCache.clear()
}
