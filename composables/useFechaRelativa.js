/**
 * Formato de fecha relativa en español.
 * Ver §4.8 de planifica.md.
 *
 * Ejemplos:
 *   "ahora", "hace 5 min", "hace 2h", "ayer", "hace 3 días",
 *   "hace 2 semanas", "hace 5 meses", "hace 1 año"
 *
 * También soporta futuras: "en 3 días", "mañana", "la próxima semana".
 */

import { parseIsoDate } from './useDateUtils'

const MS_MIN = 60_000
const MS_HORA = MS_MIN * 60
const MS_DIA = MS_HORA * 24

function startOfDay(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

export function formatRelativo(fecha, opts = {}) {
  if (fecha == null) return ''
  const { ahora = new Date() } = opts
  const target = fecha instanceof Date
    ? fecha
    : typeof fecha === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(fecha)
      ? parseIsoDate(fecha)
      : new Date(fecha)

  if (!target || Number.isNaN(target.getTime())) return ''

  const diffMs = target.getTime() - ahora.getTime()
  const futuro = diffMs > 0
  const abs = Math.abs(diffMs)

  // Días enteros (ignorando hora del día) decide la palabra principal
  const diaTarget = startOfDay(target).getTime()
  const diaAhora = startOfDay(ahora).getTime()
  const dias = Math.round((diaTarget - diaAhora) / MS_DIA)

  // Mismo día: usar minutos/horas
  if (dias === 0) {
    if (abs < MS_MIN) return 'ahora'
    if (abs < MS_HORA) {
      const m = Math.round(abs / MS_MIN)
      return futuro ? `en ${m} min` : `hace ${m} min`
    }
    const h = Math.round(abs / MS_HORA)
    return futuro ? `en ${h} h` : `hace ${h} h`
  }

  if (dias === 1) return 'mañana'
  if (dias === -1) return 'ayer'

  const absDias = Math.abs(dias)
  if (absDias < 7) {
    return dias > 0 ? `en ${absDias} días` : `hace ${absDias} días`
  }
  if (absDias < 30) {
    const semanas = Math.round(absDias / 7)
    const unidad = semanas === 1 ? 'semana' : 'semanas'
    return dias > 0 ? `en ${semanas} ${unidad}` : `hace ${semanas} ${unidad}`
  }
  if (absDias < 365) {
    const meses = Math.round(absDias / 30)
    const unidad = meses === 1 ? 'mes' : 'meses'
    return dias > 0 ? `en ${meses} ${unidad}` : `hace ${meses} ${unidad}`
  }

  const anios = Math.round(absDias / 365)
  const unidad = anios === 1 ? 'año' : 'años'
  return dias > 0 ? `en ${anios} ${unidad}` : `hace ${anios} ${unidad}`
}

export function useFechaRelativa() {
  return { formatRelativo }
}
