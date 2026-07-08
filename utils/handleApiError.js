/**
 * Extrae el mensaje de error legible de respuestas Nitro/H3.
 * Nitro retorna el mensaje en error.data.message cuando se usa createError().
 * Los errores de validación Zod (server/utils/validate.js) traen el detalle
 * en data.data.issues — sin esto el usuario solo veía "Datos inválidos".
 *
 * Nunca devuelve el mensaje técnico crudo de ofetch ('[POST] "/api/x": 500')
 * ni statusMessage genéricos ("Server Error"): eso filtra internals al toast
 * (F2 ronda 2). El detalle técnico queda en consola para depurar.
 */
export function handleApiError(err) {
  const issue = err?.data?.data?.issues?.[0]
  if (issue?.message) {
    const campo = issue.path && issue.path !== '(root)' ? `${issue.path}: ` : ''
    return `${campo}${issue.message}`
  }
  if (err?.data?.message && !esMensajeTecnico(err.data.message)) return err.data.message

  // Sin mensaje útil del servidor: dar uno humano según el tipo de fallo.
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return 'Sin conexión. Revisa tu red e inténtalo de nuevo.'
  }
  const status = err?.statusCode ?? err?.status ?? err?.response?.status
  if (status === 401) return 'Tu sesión expiró. Vuelve a iniciar sesión.'
  if (status === 403) return 'No tienes permiso para hacer esto.'
  if (status === 404) return 'No encontramos lo que buscabas. Actualiza e inténtalo de nuevo.'
  if (status === 409) return 'Alguien más modificó estos datos. Actualiza e inténtalo de nuevo.'
  if (status === 429) return 'Demasiados intentos seguidos. Espera un momento y vuelve a intentar.'
  if (status >= 500) {
    if (typeof console !== 'undefined') console.error('[api]', err)
    return 'No se pudo guardar. Revisa tu conexión e inténtalo de nuevo.'
  }

  if (err?.message && !esMensajeTecnico(err.message)) return err.message
  if (typeof console !== 'undefined') console.error('[api]', err)
  return 'Ocurrió un error inesperado. Intenta de nuevo.'
}

// Mensajes que no deben llegar al usuario: formato ofetch '[POST] "/api/x": 500',
// statusMessage por defecto de Nitro, o errores de red de bajo nivel.
function esMensajeTecnico(msg) {
  if (typeof msg !== 'string' || !msg.trim()) return true
  return (
    /^\[[A-Z]+\]\s/.test(msg) ||
    msg.includes('/api/') ||
    msg.toLowerCase().includes('fetch') ||
    /^(Server|Internal Server) Error/i.test(msg) ||
    /NetworkError|Failed to load/i.test(msg)
  )
}
