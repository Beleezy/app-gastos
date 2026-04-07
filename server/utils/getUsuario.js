import { serverSupabaseUser } from '#supabase/server'
import { db } from './db.js'
import { usuarios } from '../database/schema.js'
import { eq } from 'drizzle-orm'

export async function getUsuarioFromEvent(event) {
  const user = await serverSupabaseUser(event)

  if (!user) {
    throw createError({ statusCode: 401, message: 'No autenticado' })
  }

  const userId = user.sub ?? user.id

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
