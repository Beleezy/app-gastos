/**
 * Extrae el mensaje de error legible de respuestas Nitro/H3.
 * Nitro retorna el mensaje en error.data.message cuando se usa createError().
 */
export function handleApiError(err) {
  if (err?.data?.message) return err.data.message
  if (err?.statusMessage) return err.statusMessage
  if (err?.message && !err.message.includes('fetch')) return err.message
  return 'Ocurrió un error inesperado. Intenta de nuevo.'
}
