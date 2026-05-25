// Autoriza un correo (allowlist). Si ya existe un usuario con ese correo, lo
// marca permitido de inmediato. Solo superadmin.

import { db } from '../../utils/db.js'
import { accesosPermitidos, usuarios } from '../../database/schema.js'
import { requireSuperadmin, invalidarAccesoCache } from '../../utils/getUsuario.js'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const adminId = await requireSuperadmin(event)
  const body = await readBody(event)
  const email = String(body?.email || '').trim().toLowerCase()
  if (!email || !email.includes('@')) {
    throw createError({ statusCode: 400, message: 'Correo inválido' })
  }

  const [acceso] = await db
    .insert(accesosPermitidos)
    .values({ email, agregadoPor: adminId })
    .onConflictDoNothing()
    .returning()

  // Si ya hay un usuario registrado con ese correo, permitirlo al instante.
  const actualizados = await db
    .update(usuarios)
    .set({ permitido: true })
    .where(eq(usuarios.email, email))
    .returning({ id: usuarios.id })
  for (const u of actualizados) invalidarAccesoCache(u.id)

  return { ok: true, acceso: acceso || null }
})
