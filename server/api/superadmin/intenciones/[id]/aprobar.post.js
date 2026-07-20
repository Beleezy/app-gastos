// Aprueba una intención de registro: crea/permite el usuario y marca la
// intención como aprobada. Solo superadmin.

import { db } from '../../../../utils/db.js'
import { intencionesRegistro, usuarios } from '../../../../database/schema.js'
import { requireSuperadmin, invalidarAccesoCache } from '../../../../utils/getUsuario.js'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const adminId = await requireSuperadmin(event)
  const id = getRouterParam(event, 'id')

  const [intent] = await db
    .select()
    .from(intencionesRegistro)
    .where(eq(intencionesRegistro.id, id))
    .limit(1)
  if (!intent) {
    throw createError({ statusCode: 404, message: 'Intención no encontrada' })
  }

  await db
    .insert(usuarios)
    .values({
      id: intent.supabaseUserId,
      nombre: intent.nombre || intent.email?.split('@')[0] || 'Usuario',
      email: intent.email,
      rol: 'usuario',
      permitido: true,
    })
    .onConflictDoUpdate({ target: usuarios.id, set: { permitido: true } })

  await db
    .update(intencionesRegistro)
    .set({
      estado: 'aprobada',
      decididoPor: adminId,
      decididoEn: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(intencionesRegistro.id, id))

  invalidarAccesoCache(intent.supabaseUserId)
  return { ok: true }
})
