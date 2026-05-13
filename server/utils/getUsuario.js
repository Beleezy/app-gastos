import { serverSupabaseUser } from '#supabase/server'
import { db } from './db.js'
import { usuarios } from '../database/schema.js'
import { eq } from 'drizzle-orm'
import { rateLimits } from './rateLimit.js'

// Aplica rate limit por usuario (minuto + hora) una sola vez por request.
// Se invoca aquí en lugar de en cada handler para que TODO endpoint
// autenticado quede protegido sin tener que recordar añadirlo.
function aplicarRateLimitUsuario(event, userId) {
  if (event.context?._rateLimitedUser) return
  event.context._rateLimitedUser = true
  rateLimits.apiPerUserMinute(event, userId)
  rateLimits.apiPerUserHour(event, userId)
}

export async function getUsuarioFromEvent(event) {
  // Bypass de auth para tests E2E (server/middleware/03.e2e-auth-bypass.js)
  if (event.context?.e2eBypass && event.context?.usuario?.id) {
    const e2eId = event.context.usuario.id
    const [existe] = await db.select({ id: usuarios.id }).from(usuarios).where(eq(usuarios.id, e2eId)).limit(1)
    if (!existe) {
      await db.insert(usuarios).values({
        id: e2eId,
        nombre: 'E2E Test User',
        email: event.context.usuario.email || 'e2e@test.local',
      }).onConflictDoNothing()
    }
    return e2eId
  }

  const user = await serverSupabaseUser(event)

  if (!user) {
    throw createError({ statusCode: 401, message: 'No autenticado' })
  }

  const userId = user.sub ?? user.id

  aplicarRateLimitUsuario(event, userId)

  // Auto-provisionar: si el usuario OAuth no existe en la tabla usuarios, crearlo
  const [existe] = await db
    .select({ id: usuarios.id })
    .from(usuarios)
    .where(eq(usuarios.id, userId))
    .limit(1)

  if (!existe) {
    await db.insert(usuarios).values({
      id: userId,
      nombre: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Usuario',
      email: user.email || null,
    }).onConflictDoNothing()
  }

  return userId
}
