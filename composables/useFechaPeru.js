import { addDias } from './useDateUtils'

/**
 * Fecha y hora actuales en la zona horaria DEL USUARIO — la misma que usa el
 * servidor (`configuraciones.zonaHoraria`, ver server/utils/fechaLocal.js).
 * Uso en el cliente para inputs de fecha/hora por defecto y para decidir qué
 * día es "hoy" (historial, "Hoy/Ayer", mes en curso).
 *
 * Antes estaba fijada a America/Lima mientras el servidor leía la zona
 * configurada: un usuario con otra zona veía el historial de un día y la API
 * le devolvía el de otro. Si la configuración aún no cargó (o el composable
 * corre fuera del contexto de Nuxt, como en los tests) cae a Lima, que es
 * también el default de la columna.
 *
 * Nunca usar `new Date().toISOString().split('T')[0]` para "hoy": eso es la
 * fecha en UTC, que en Lima es MAÑANA desde las 19:00.
 */
const ZONA_DEFAULT = 'America/Lima'

function zonaConfigurada() {
  try {
    const cfg = useState('configuraciones')
    const tz = cfg?.value?.zonaHoraria
    if (typeof tz === 'string' && tz.trim()) return tz
  } catch {
    // fuera del contexto de Nuxt (tests, scripts)
  }
  return ZONA_DEFAULT
}

function partesEnZona(timeZone, now) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(now)
}

export function useFechaPeru() {
  function ahora() {
    const now = new Date()
    let parts
    try {
      parts = partesEnZona(zonaConfigurada(), now)
    } catch {
      // zona guardada que este runtime no conoce
      parts = partesEnZona(ZONA_DEFAULT, now)
    }
    const get = (t) => parts.find((p) => p.type === t)?.value
    let hora = get('hour')
    if (hora === '24') hora = '00'
    return {
      fecha: `${get('year')}-${get('month')}-${get('day')}`,
      hora: `${hora}:${get('minute')}`,
    }
  }

  function fechaHoy() {
    return ahora().fecha
  }

  function horaActual() {
    return ahora().hora
  }

  /** `{ anio, mes, dia }` numéricos del hoy del usuario. */
  function partesHoy() {
    const [anio, mes, dia] = fechaHoy().split('-').map(Number)
    return { anio, mes, dia }
  }

  function fechaAyer() {
    return addDias(fechaHoy(), -1)
  }

  return { ahora, fechaHoy, horaActual, partesHoy, fechaAyer }
}
