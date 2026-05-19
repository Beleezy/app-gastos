import { serverSupabaseUser } from '#supabase/server'
import { db } from './db.js'
import { usuarios } from '../database/schema.js'
import { eq } from 'drizzle-orm'
import { rateLimits } from './rateLimit.js'

// Aplica rate limit por usuario (minuto + hora) una sola vez por request.
// Se invoca aquí en lugar de en cada handler para que TODO endpoint
// autenticado quede protegido sin tener que recordar añadirlo.
async function aplicarRateLimitUsuario(event, userId) {
  if (event.context?._rateLimitedUser) return
  event.context._rateLimitedUser = true
  await rateLimits.apiPerUserMinute(event, userId)
  await rateLimits.apiPerUserHour(event, userId)
}

// Cache in-memory de usuarios ya provisionados. Una vez verificado que el
// UUID existe en `usuarios`, evitamos hacer SELECT + INSERT en cada request
// autenticado. Reset al reiniciar el proceso (sin coste, se rellena solo).
const provisionedUsers = new Set()

async function provisionarUsuarioSiHaceFalta(userId, valores) {
  if (provisionedUsers.has(userId)) return
  const [existe] = await db
    .select({ id: usuarios.id })
    .from(usuarios)
    .where(eq(usuarios.id, userId))
    .limit(1)
  if (!existe) {
    await db.insert(usuarios).values(valores).onConflictDoNothing()
  }
  provisionedUsers.add(userId)
}

export async function getUsuarioFromEvent(event) {
  // Bypass de auth para tests E2E (server/middleware/03.e2e-auth-bypass.js)
  if (event.context?.e2eBypass && event.context?.usuario?.id) {
    const e2eId = event.context.usuario.id
    await provisionarUsuarioSiHaceFalta(e2eId, {
      id: e2eId,
      nombre: 'E2E Test User',
      email: event.context.usuario.email || 'e2e@test.local',
    })
    return e2eId
  }

  const user = await serverSupabaseUser(event)

  if (!user) {
    throw createError({ statusCode: 401, message: 'No autenticado' })
  }

  const userId = user.sub ?? user.id

  await aplicarRateLimitUsuario(event, userId)

  await provisionarUsuarioSiHaceFalta(userId, {
    id: userId,
    nombre: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Usuario',
    email: user.email || null,
  })

  return userId
}
