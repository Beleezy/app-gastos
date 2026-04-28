// Validación de variables de entorno al arrancar Nitro.
// Ver §1.8 de planifica.md.
//
// Si falta una clave crítica, loguea WARN para que el operador la
// detecte temprano (en vez de fallar en runtime al primer request).

import { logger } from '../utils/logger.js'

export default defineNitroPlugin(() => {
  const required = ['DATABASE_URL', 'SUPABASE_URL', 'SUPABASE_ANON_KEY']
  const recommended = ['GEMINI_API_KEY', 'SUPABASE_SERVICE_ROLE_KEY']

  const missing = required.filter((k) => !process.env[k])
  const missingOpt = recommended.filter((k) => !process.env[k])

  if (missing.length > 0) {
    logger.error('Variables de entorno requeridas ausentes', { missing })
  }
  if (missingOpt.length > 0) {
    logger.warn('Variables recomendadas ausentes (algunas features estarán deshabilitadas)', {
      missing: missingOpt,
    })
  }

  if (missing.length === 0 && missingOpt.length === 0) {
    logger.info('Configuración de entorno OK')
  }
})
