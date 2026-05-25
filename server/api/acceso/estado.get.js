// Estado de acceso del usuario autenticado, SIN lanzar 403. El cliente lo usa
// para decidir si mostrar la app o la pantalla de "acceso pendiente".
//
// Devuelve: { estado: 'no_autenticado' | 'aprobado' | 'pendiente' | 'rechazado', rol? }

import { serverSupabaseUser } from '#supabase/server'
import { db } from '../../utils/db.js'
import { usuarios, intencionesRegistro } from '../../database/schema.js'
import { registrarIntencion } from '../../utils/getUsuario.js'
import { eq } from 'drizzle-orm'

function controlAccesoActivo() {
  return !!(process.env.SUPERADMIN_EMAIL || '').trim()
}
function esSuperadminEmail(email) {
  const sa = (process.env.SUPERADMIN_EMAIL || '').trim().toLowerCase()
  return !!sa && !!email && email.trim().toLowerCase() === sa
}

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) return { estado: 'no_autenticado' }

  const userId = user.sub ?? user.id
  const email = user.email || null
  const nombre = user.user_metadata?.full_name || email?.split('@')[0] || 'Usuario'

  if (!controlAccesoActivo()) return { estado: 'aprobado' }
  if (esSuperadminEmail(email)) return { estado: 'aprobado', rol: 'superadmin' }

  const [u] = await db
    .select({ permitido: usuarios.permitido, rol: usuarios.rol })
    .from(usuarios)
    .where(eq(usuarios.id, userId))
    .limit(1)
  if (u && (u.permitido || u.rol === 'superadmin')) {
    return { estado: 'aprobado', rol: u.rol }
  }

  // Asegurar la intención para que el superadmin la vea, y reportar su estado.
  await registrarIntencion({ supabaseUserId: userId, email, nombre })
  const [intent] = await db
    .select({ estado: intencionesRegistro.estado })
    .from(intencionesRegistro)
    .where(eq(intencionesRegistro.supabaseUserId, userId))
    .limit(1)
  return { estado: intent?.estado === 'rechazada' ? 'rechazado' : 'pendiente' }
})
