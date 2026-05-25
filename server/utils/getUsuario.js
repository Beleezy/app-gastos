import { serverSupabaseUser } from '#supabase/server'
import { db } from './db.js'
import { usuarios, intencionesRegistro } from '../database/schema.js'
import { eq, and } from 'drizzle-orm'
import { rateLimits } from './rateLimit.js'

// Aplica rate limit por usuario (minuto + hora) una sola vez por request.
async function aplicarRateLimitUsuario(event, userId) {
  if (event.context?._rateLimitedUser) return
  event.context._rateLimitedUser = true
  await rateLimits.apiPerUserMinute(event, userId)
  await rateLimits.apiPerUserHour(event, userId)
}

// Cache in-memory de usuarios con acceso confirmado (aprobados / superadmin).
const accesoConfirmado = new Set()

function controlAccesoActivo() {
  return !!(process.env.SUPERADMIN_EMAIL || '').trim()
}

function esSuperadminEmail(email) {
  const sa = (process.env.SUPERADMIN_EMAIL || '').trim().toLowerCase()
  return !!sa && !!email && email.trim().toLowerCase() === sa
}

// ── Perfiles gestionados (familia) ──
// Rutas cuyos datos se reencuadran al "perfil activo" (mini-usuario sin login)
// cuando el cliente envía la cabecera X-Perfil-Id. El resto (categorías,
// configuración, superadmin, métricas, futuros, papelera) siempre opera sobre
// el usuario real → quedan compartidas/globales.
const RUTAS_PERFIL = [
  /^\/api\/gastos(\/|$|\?)/,
  /^\/api\/ingresos(\/|$|\?)/,
  /^\/api\/deudas(\/|$|\?)/,
  /^\/api\/ahorros(\/|$|\?)/,
  /^\/api\/dashboard/,
  /^\/api\/planificador(\/|$|\?)/,
]

function rutaUsaPerfil(path) {
  if (/^\/api\/planificador\/futuros/.test(path)) return false
  return RUTAS_PERFIL.some((r) => r.test(path))
}

// Si hay un perfil activo válido (propiedad del usuario real) y la ruta lo
// admite, devuelve el id del perfil como "dueño efectivo" de los datos.
async function resolverPerfilEfectivo(event, realId) {
  const perfilId = getRequestHeader(event, 'x-perfil-id')
  if (!perfilId) return realId
  const path = getRequestURL(event).pathname || ''
  if (!rutaUsaPerfil(path)) return realId

  const [p] = await db
    .select({ id: usuarios.id })
    .from(usuarios)
    .where(and(eq(usuarios.id, perfilId), eq(usuarios.gestionadoPorId, realId)))
    .limit(1)
  if (!p) {
    throw createError({ statusCode: 403, message: 'Perfil no válido' })
  }
  event.context.usuarioReal = realId
  return perfilId
}

// Registra (o conserva) la intención de registro de un solicitante no aprobado.
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
    return resolverPerfilEfectivo(event, e2eId)
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
    return resolverPerfilEfectivo(event, userId)
  }

  // Superadmin: siempre permitido.
  if (esSuperadminEmail(email)) {
    if (!accesoConfirmado.has(userId)) {
      await asegurarSuperadmin(userId, email, nombre)
      accesoConfirmado.add(userId)
    }
    return resolverPerfilEfectivo(event, userId)
  }

  if (accesoConfirmado.has(userId)) return resolverPerfilEfectivo(event, userId)

  const [u] = await db
    .select({ permitido: usuarios.permitido, rol: usuarios.rol })
    .from(usuarios)
    .where(eq(usuarios.id, userId))
    .limit(1)

  if (u && (u.permitido || u.rol === 'superadmin')) {
    accesoConfirmado.add(userId)
    return resolverPerfilEfectivo(event, userId)
  }

  // No aprobado: registrar intención y bloquear con señal "pendiente".
  await registrarIntencion({ supabaseUserId: userId, email, nombre })
  throw createError({
    statusCode: 403,
    statusMessage: 'ACCESO_PENDIENTE',
    message: 'Tu acceso está pendiente de validación.',
  })
}

// Usuario real autenticado, ignorando el perfil activo. Útil para auditoría.
export async function getUsuarioRealFromEvent(event) {
  await getUsuarioFromEvent(event)
  return event.context?.usuarioReal || (await serverSupabaseUser(event))?.id || null
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
