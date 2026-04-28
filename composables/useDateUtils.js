/**
 * Helpers de fecha sin dependencias externas. Trabajan en local time
 * del usuario (`date-only` ISO YYYY-MM-DD) para evitar drift por UTC.
 *
 * Reemplaza el array común de operaciones de fecha duplicadas hoy en
 * useGastos, usePlanificador, voz/parse y composables varios.
 */

const DIAS_SEMANA = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']
const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
]

export function toIsoDate(d) {
  if (!d) return ''
  const x = d instanceof Date ? d : new Date(d)
  if (Number.isNaN(x.getTime())) return ''
  const y = x.getFullYear()
  const m = String(x.getMonth() + 1).padStart(2, '0')
  const dd = String(x.getDate()).padStart(2, '0')
  return `${y}-${m}-${dd}`
}

export function parseIsoDate(iso) {
  if (typeof iso !== 'string') return null
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso)
  if (!m) return null
  return new Date(parseInt(m[1], 10), parseInt(m[2], 10) - 1, parseInt(m[3], 10))
}

export function addDias(iso, n) {
  const d = parseIsoDate(iso)
  if (!d) return iso
  d.setDate(d.getDate() + n)
  return toIsoDate(d)
}

export function diasEntre(isoA, isoB) {
  const a = parseIsoDate(isoA)
  const b = parseIsoDate(isoB)
  if (!a || !b) return null
  return Math.round((b - a) / (1000 * 60 * 60 * 24))
}

export function inicioFinMes(anio, mes) {
  const desde = `${anio}-${String(mes).padStart(2, '0')}-01`
  const ultDia = new Date(anio, mes, 0).getDate()
  const hasta = `${anio}-${String(mes).padStart(2, '0')}-${String(ultDia).padStart(2, '0')}`
  return { desde, hasta, dias: ultDia }
}

export function nombreDiaSemana(iso) {
  const d = parseIsoDate(iso)
  if (!d) return ''
  return DIAS_SEMANA[d.getDay()]
}

export function nombreMes(mes) {
  if (!mes || mes < 1 || mes > 12) return ''
  return MESES[mes - 1]
}

/**
 * Devuelve un objeto con varias representaciones útiles de "hoy" en
 * la zona horaria provista (default America/Lima).
 */
export function hoyEnZona(zonaHoraria = 'America/Lima') {
  const ahora = new Date(new Date().toLocaleString('en-US', { timeZone: zonaHoraria }))
  return {
    fecha: toIsoDate(ahora),
    diaSemana: DIAS_SEMANA[ahora.getDay()],
    anio: ahora.getFullYear(),
    mes: ahora.getMonth() + 1,
    dia: ahora.getDate(),
  }
}

/**
 * Devuelve el rango ISO desde N días atrás hasta hoy.
 */
export function ultimosNDias(n, zonaHoraria) {
  const { fecha } = hoyEnZona(zonaHoraria)
  return { desde: addDias(fecha, -Math.abs(n)), hasta: fecha }
}

export function useDateUtils() {
  return {
    toIsoDate,
    parseIsoDate,
    addDias,
    diasEntre,
    inicioFinMes,
    nombreDiaSemana,
    nombreMes,
    hoyEnZona,
    ultimosNDias,
  }
}
