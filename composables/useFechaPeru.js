/**
 * Devuelve fecha y hora actuales en zona horaria America/Lima (UTC-5).
 * Uso en el cliente para inputs de fecha/hora por defecto.
 */
export function useFechaPeru() {
  function ahora() {
    const now = new Date()
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Lima',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(now)
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

  return { ahora, fechaHoy, horaActual }
}
