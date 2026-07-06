/**
 * Extrae el mensaje de error legible de respuestas Nitro/H3.
 * Nitro retorna el mensaje en error.data.message cuando se usa createError().
 * Los errores de validación Zod (server/utils/validate.js) traen el detalle
 * en data.data.issues — sin esto el usuario solo veía "Datos inválidos".
 */
export function handleApiError(err) {
  const issue = err?.data?.data?.issues?.[0]
  if (issue?.message) {
    const campo = issue.path && issue.path !== '(root)' ? `${issue.path}: ` : ''
    return `${campo}${issue.message}`
  }
  if (err?.data?.message) return err.data.message
  if (err?.statusMessage) return err.statusMessage
  if (err?.message && !err.message.includes('fetch')) return err.message
  return 'Ocurrió un error inesperado. Intenta de nuevo.'
}
