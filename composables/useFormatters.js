import { MESES, DIAS_SEMANA } from '~/utils/constants'

export function useFormatters() {
  /**
   * Formatea una fecha string "YYYY-MM-DD" a texto legible.
   * @param {string} fecha - Fecha en formato YYYY-MM-DD
   * @returns {string} Ej: "15 de enero, 2025"
   */
  function formatFecha(fecha) {
    if (!fecha) return ''
    const d = new Date(fecha + 'T00:00:00')
    const dia = d.getDate()
    return `${dia} de ${MESES[d.getMonth()].toLowerCase()}, ${d.getFullYear()}`
  }

  /**
   * Formatea una fecha string "YYYY-MM-DD" a texto corto.
   * @param {string} fecha
   * @returns {string} Ej: "15/01/2025"
   */
  function formatFechaCorta(fecha) {
    if (!fecha) return ''
    const d = new Date(fecha + 'T00:00:00')
    return d.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' })
  }

  /**
   * Formatea una fecha indicando si es hoy, ayer, o el día de la semana.
   * @param {string} fecha
   * @returns {string} Ej: "Hoy", "Ayer", "Lunes 15"
   */
  function formatFechaDia(fecha) {
    if (!fecha) return ''
    const [anio, mes, dia] = fecha.split('-').map(Number)
    const d = new Date(anio, mes - 1, dia)
    const hoy = new Date()
    hoy.setHours(0, 0, 0, 0)
    const ayer = new Date(hoy)
    ayer.setDate(ayer.getDate() - 1)

    if (d.toDateString() === hoy.toDateString()) return 'Hoy'
    if (d.toDateString() === ayer.toDateString()) return 'Ayer'
    return `${DIAS_SEMANA[d.getDay()]} ${dia}`
  }

  /**
   * Formatea una hora "HH:MM:SS" a formato 12h.
   * @param {string} hora
   * @returns {string} Ej: "2:30 pm"
   */
  function formatHora(hora) {
    if (!hora) return ''
    const [hh, mm] = hora.split(':').map(Number)
    const suffix = hh >= 12 ? 'pm' : 'am'
    const h12 = hh % 12 || 12
    return `${h12}:${String(mm).padStart(2, '0')} ${suffix}`
  }

  /**
   * Retorna nombre de mes y año. Ej: "Enero 2025"
   * @param {number} mes - 1 a 12
   * @param {number} anio
   */
  function formatMesAnio(mes, anio) {
    return `${MESES[mes - 1]} ${anio}`
  }


  /**
   * Formatea monto monetario con símbolo local (PEN por defecto).
   * @param {number|string} monto
   * @param {string} locale
   * @param {string} currency
   */
  function formatCurrency(monto, locale = 'es-PE', currency = 'PEN') {
    const n = Number(monto || 0)
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Number.isFinite(n) ? n : 0)
  }

  return { formatFecha, formatFechaCorta, formatFechaDia, formatHora, formatMesAnio, formatCurrency }
}
