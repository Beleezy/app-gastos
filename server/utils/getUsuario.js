import { serverSupabaseUser } from '#supabase/server'
import { db } from './db.js'
import { usuarios, accesosPermitidos } from '../database/schema.js'
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

// Cache de usuarios con acceso confirmado (allowlist). Solo cacheamos las
// decisiones "permitido"; las denegadas se re-evalúan en cada request por si
// el superadmin recién autorizó el correo.
const allowedUsers = new Set()

// El control de acceso por allowlist SOLO se activa si hay un SUPERADMIN_EMAIL
// configurado. Sin él, la app funciona abierta (comportamiento previo) para no
// bloquear a nadie por una mala configuración.
function allowlistActiva() {
  return !!(process.env.SUPERADMIN_EMAIL || '').trim()
}

function esSuperadminEmail(email) {
  const sa = (process.env.SUPERADMIN_EMAIL || '').trim().toLowerCase()
  return !!sa && !!email && email.trim().toLowerCase() === sa
}

async function emailEnAllowlist(email) {
  if (!email) return false
  const [row] = await db
    .select({ id: accesosPermitidos.id })
    .from(accesosPermitidos)
    .where(eq(accesosPermitidos.email, email.trim().toLowerCase()))
    .limit(1)
  return !!row
}

async function provisionarUsuarioSiHaceFalta(userId, valores) {
  if (provisionedUsers.has(userId)) return
  const [existe] = await db
    .select({ id: usuarios.id })
    .from(usuarios)
    .where(eq(usuarios.id, userId))
    .limit(1)
  if (!existe) {
    const sa = esSuperadminEmail(valores.email)
    const permitido = !allowlistActiva() || sa || (await emailEnAllowlist(valores.email))
    await db
      .insert(usuarios)
      .values({ ...valores, rol: sa ? 'superadmin' : 'usuario', permitido })
      .onConflictDoNothing()
  }
  provisionedUsers.add(userId)
}

// Gate de acceso al sistema. Lanza 403 si el usuario no está autorizado.
async function asegurarAccesoPermitido(userId, email) {
  if (!allowlistActiva()) return
  if (allowedUsers.has(userId)) return

  // Superadmin: siempre permitido. Asegura rol/permitido en BD.
  if (esSuperadminEmail(email)) {
    await db.update(usuarios).set({ rol: 'superadmin', permitido: true }).where(eq(usuarios.id, userId))
    allowedUsers.add(userId)
    return
  }

  const [row] = await db
    .select({ rol: usuarios.rol, permitido: usuarios.permitido })
    .from(usuarios)
    .where(eq(usuarios.id, userId))
    .limit(1)
  if (row?.rol === 'superadmin' || row?.permitido) {
    allowedUsers.add(userId)
    return
  }

  // ¿El superadmin agregó el correo tras un primer rechazo? Re-evaluar.
  if (await emailEnAllowlist(email)) {
    await db.update(usuarios).set({ permitido: true }).where(eq(usuarios.id, userId))
    allowedUsers.add(userId)
    return
  }

  throw createError({
    statusCode: 403,
    statusMessage: 'Acceso no autorizado',
    message: 'Tu cuenta no tiene acceso. Pide al administrador que autorice tu correo.',
  })
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
  const email = user.email || null

  await aplicarRateLimitUsuario(event, userId)

  await provisionarUsuarioSiHaceFalta(userId, {
    id: userId,
    nombre: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Usuario',
    email,
  })

  await asegurarAccesoPermitido(userId, email)

  return userId
}

// Exige que el usuario autenticado sea superadmin. Devuelve su userId o lanza 403.
export async function requireSuperadmin(event) {
  const userId = await getUsuarioFromEvent(event)
  const [row] = await db
    .select({ rol: usuarios.rol })
    .from(usuarios)
    .where(eq(usuarios.id, userId))
    .limit(1)
  if (row?.rol !== 'superadmin') {
    throw createError({ statusCode: 403, message: 'Requiere superadministrador' })
  }
  return userId
}

// Invalida el cache de acceso de un usuario (p.ej. al cambiar su `permitido`).
export function invalidarAccesoCache(userId) {
  if (userId) allowedUsers.delete(userId)
}
