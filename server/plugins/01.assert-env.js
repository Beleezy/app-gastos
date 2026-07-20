// Validación de variables de entorno al arrancar Nitro.
// Ver §1.8 de planifica.md.
//
// Si falta una clave crítica, loguea error para que el operador la
// detecte temprano (en vez de fallar en runtime al primer request).
//
// En producción ampliamos la lista required con vars de seguridad que,
// si faltan, dejan la app expuesta en modos no obvios:
//
// - ENCRYPTION_KEY: sin ella, encrypt() en server/utils/crypto.js
//   arroja sólo cuando alguien conecta Google Calendar. Mejor fallar
//   al boot que mostrar un error al primer OAuth callback de un usuario.
// - APP_PUBLIC_URL: el middleware de CORS (01.cors.js) usa esta URL
//   como allowlist. Si está vacía y ALLOWED_ORIGINS también, TODO
//   request cross-origin es bloqueado, lo que rompe la app desde un
//   dominio personalizado. Mejor avisar al boot.

import { logger } from '../utils/logger.js'

const REQUIRED_BASE = ['DATABASE_URL', 'SUPABASE_URL', 'SUPABASE_ANON_KEY']
const REQUIRED_PROD = ['ENCRYPTION_KEY', 'APP_PUBLIC_URL']
const RECOMMENDED = ['GEMINI_API_KEY', 'SUPABASE_SERVICE_ROLE_KEY']

export default defineNitroPlugin(() => {
  const isProd = process.env.NODE_ENV === 'production'
  const required = isProd ? [...REQUIRED_BASE, ...REQUIRED_PROD] : REQUIRED_BASE

  const missing = required.filter((k) => !process.env[k])
  const missingOpt = RECOMMENDED.filter((k) => !process.env[k])

  if (missing.length > 0) {
    logger.error('Variables de entorno requeridas ausentes', { missing })
  }
  if (missingOpt.length > 0) {
    logger.warn('Variables recomendadas ausentes (algunas features estarán deshabilitadas)', {
      missing: missingOpt,
    })
  }

  // Alerta extra: si DEV_AUTH_BYPASS=1 llega a un proceso de producción
  // (variable seteada por error), el middleware 04 lo ignorará por
  // NODE_ENV, pero es señal de configuración rota — avisar siempre.
  if (isProd && process.env.DEV_AUTH_BYPASS === '1') {
    logger.error(
      'DEV_AUTH_BYPASS=1 detectado en producción — ignorado por NODE_ENV, pero revisa la configuración del deploy',
      {},
    )
  }

  if (missing.length === 0 && missingOpt.length === 0) {
    logger.info('Configuración de entorno OK')
  }
})
