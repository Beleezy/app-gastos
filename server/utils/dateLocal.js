// Helpers de fecha en server-side (espejo de composables/useDateUtils.js
// pero importables desde Nitro sin pasar por auto-imports de Nuxt).
// Ver §16 de planifica.md.

const DIAS_SEMANA = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']

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

/**
 * Devuelve hoy en zona horaria del usuario con día de semana en español
 * y un map de "lunes pasado", "martes pasado", etc., a fecha ISO.
 * Usado por voz/parse para alimentar el system prompt del LLM.
 */
export function hoyConReferencias(zonaHoraria = 'America/Lima') {
  const ahora = new Date(new Date().toLocaleString('en-US', { timeZone: zonaHoraria }))
  const fecha = toIsoDate(ahora)
  const diaSemana = DIAS_SEMANA[ahora.getDay()]

  const referencias = {}
  for (let i = 1; i <= 7; i++) {
    const d = new Date(ahora)
    d.setDate(d.getDate() - i)
    const nombre = DIAS_SEMANA[d.getDay()]
    const f = toIsoDate(d)
    if (!referencias[nombre]) referencias[nombre] = f
  }

  return {
    fecha,
    diaSemana,
    referencias,
    referenciasTexto: Object.entries(referencias)
      .map(([d, f]) => `${d} pasado = ${f}`)
      .join(', '),
  }
}
