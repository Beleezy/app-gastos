// Rechaza una intención de registro: marca rechazada y revoca el acceso si el
// usuario ya existía. Solo superadmin.

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

  await db.update(usuarios).set({ permitido: false }).where(eq(usuarios.id, intent.supabaseUserId))
  await db
    .update(intencionesRegistro)
    .set({ estado: 'rechazada', decididoPor: adminId, decididoEn: new Date(), updatedAt: new Date() })
    .where(eq(intencionesRegistro.id, id))

  invalidarAccesoCache(intent.supabaseUserId)
  return { ok: true }
})
