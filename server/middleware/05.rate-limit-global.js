// Rate limit global por IP para todo /api/*.
//
// Es la primera línea de defensa contra abuso anónimo (scrapers, fuerza
// bruta de auth, bots). El límite por USUARIO autenticado se aplica
// dentro de getUsuarioFromEvent, donde ya conocemos el userId.
//
// Excepciones:
// - /api/health: el health check de uptime monitoring no debe ser
//   throttled — si lo es, la métrica de disponibilidad miente.
// - bypass E2E/dev: cuando ya se inyectó event.context.e2eBypass por
//   los middlewares 03/04, saltamos el límite para no romper suites
//   de tests que ejecutan muchas peticiones consecutivas.

import { rateLimits } from '../utils/rateLimit.js'

export default defineEventHandler((event) => {
  const url = event.node.req.url || ''
  if (!url.startsWith('/api/')) return
  if (url.startsWith('/api/health')) return
  if (event.context?.e2eBypass) return

  rateLimits.apiGlobalIp(event)
})
