import { serverSupabaseUser } from '#supabase/server'
import { db } from './db.js'
import { usuarios, intencionesRegistro } from '../database/schema.js'
import { eq } from 'drizzle-orm'
import { rateLimits } from './rateLimit.js'

// Aplica rate limit por usuario (minuto + hora) una sola vez por request.
async function aplicarRateLimitUsuario(event, userId) {
  if (event.context?._rateLimitedUser) return
  event.context._rateLimitedUser = true
  await rateLimits.apiPerUserMinute(event, userId)
  await rateLimits.apiPerUserHour(event, userId)
}

// Cache in-memory de usuarios con acceso confirmado (aprobados / superadmin).
// Solo se cachean decisiones positivas; se invalida al cambiar el acceso.
const accesoConfirmado = new Set()

// El control de acceso SOLO se activa si hay un SUPERADMIN_EMAIL configurado.
// Sin él, la app funciona abierta (no se bloquea a nadie por mala config).
function controlAccesoActivo() {
  return !!(process.env.SUPERADMIN_EMAIL || '').trim()
}

function esSuperadminEmail(email) {
  const sa = (process.env.SUPERADMIN_EMAIL || '').trim().toLowerCase()
  return !!sa && !!email && email.trim().toLowerCase() === sa
}

// Registra (o conserva) la intención de registro de un solicitante no aprobado.
// onConflictDoNothing: no duplica ni reabre intenciones ya decididas.
export async function registrarIntencion({ supabaseUserId, email, nombre }) {
  await db
    .insert(intencionesRegistro)
    .values({ supabaseUserId, email: (email || '').toLowerCase(), nombre: nombre || null })
    .onConflictDoNothing()
}

async function asegurarSuperadmin(userId, email, nombre) {
  await db
    .insert(usuarios)
    .values({ id: userId, nombre, email, rol: 'superadmin', permitido: true })
    .onConflictDoUpdate({
      target: usuarios.id,
      set: { rol: 'superadmin', permitido: true, email },
    })
  // El trigger pudo registrar su propia intención; márcala como aprobada para
  // que el superadmin no aparezca como "pendiente" en su propio panel.
  await db
    .update(intencionesRegistro)
    .set({ estado: 'aprobada' })
    .where(eq(intencionesRegistro.supabaseUserId, userId))
}

export async function getUsuarioFromEvent(event) {
  // Bypass de auth para tests E2E (server/middleware/03.e2e-auth-bypass.js)
  if (event.context?.e2eBypass && event.context?.usuario?.id) {
    const e2eId = event.context.usuario.id
    await db
      .insert(usuarios)
      .values({
        id: e2eId,
        nombre: 'E2E Test User',
        email: event.context.usuario.email || 'e2e@test.local',
        permitido: true,
      })
      .onConflictDoNothing()
    return e2eId
  }

  const user = await serverSupabaseUser(event)
  if (!user) {
    throw createError({ statusCode: 401, message: 'No autenticado' })
  }

  const userId = user.sub ?? user.id
  const email = user.email || null
  const nombre = user.user_metadata?.full_name || email?.split('@')[0] || 'Usuario'

  await aplicarRateLimitUsuario(event, userId)

  // Modo abierto: sin control de acceso, se autoprovisiona y permite.
  if (!controlAccesoActivo()) {
    if (!accesoConfirmado.has(userId)) {
      await db
        .insert(usuarios)
        .values({ id: userId, nombre, email, permitido: true })
        .onConflictDoNothing()
      accesoConfirmado.add(userId)
    }
    return userId
  }

  // Superadmin: siempre permitido.
  if (esSuperadminEmail(email)) {
    if (!accesoConfirmado.has(userId)) {
      await asegurarSuperadmin(userId, email, nombre)
      accesoConfirmado.add(userId)
    }
    return userId
  }

  if (accesoConfirmado.has(userId)) return userId

  const [u] = await db
    .select({ permitido: usuarios.permitido, rol: usuarios.rol })
    .from(usuarios)
    .where(eq(usuarios.id, userId))
    .limit(1)

  if (u && (u.permitido || u.rol === 'superadmin')) {
    accesoConfirmado.add(userId)
    return userId
  }

  // No aprobado: registrar intención y bloquear con señal "pendiente".
  await registrarIntencion({ supabaseUserId: userId, email, nombre })
  throw createError({
    statusCode: 403,
    statusMessage: 'ACCESO_PENDIENTE',
    message: 'Tu acceso está pendiente de validación.',
  })
}

// Exige que el usuario autenticado sea superadmin. Devuelve su userId o lanza.
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

// Invalida el cache de acceso de un usuario (al aprobar/rechazar/revocar).
export function invalidarAccesoCache(userId) {
  if (userId) accesoConfirmado.delete(userId)
}
