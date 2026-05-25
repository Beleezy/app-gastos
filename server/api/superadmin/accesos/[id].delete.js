// Quita un correo de la allowlist. No revoca a usuarios ya permitidos (eso se
// hace desde el toggle por usuario). Solo superadmin.

import { db } from '../../../utils/db.js'
import { accesosPermitidos } from '../../../database/schema.js'
import { requireSuperadmin } from '../../../utils/getUsuario.js'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  await requireSuperadmin(event)
  const id = getRouterParam(event, 'id')
  await db.delete(accesosPermitidos).where(eq(accesosPermitidos.id, id))
  return { ok: true }
})
