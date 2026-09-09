// Activa/desactiva el acceso de un usuario al sistema. Solo superadmin.

import { db } from '../../../utils/db.js'
import { usuarios } from '../../../database/schema.js'
import { requireSuperadmin, invalidarAccesoCache } from '../../../utils/getUsuario.js'
import { eq } from 'drizzle-orm'
import { getUuidParam } from '../../../utils/params.js'

export default defineEventHandler(async (event) => {
  const adminId = await requireSuperadmin(event)
  const id = getUuidParam(event, 'id', { recurso: 'Usuario' })
  const body = await readBody(event)
  const permitido = !!body?.permitido

  if (id === adminId && !permitido) {
    throw createError({ statusCode: 400, message: 'No puedes revocar tu propio acceso' })
  }

  await db.update(usuarios).set({ permitido }).where(eq(usuarios.id, id))
  invalidarAccesoCache(id)
  return { ok: true }
})
