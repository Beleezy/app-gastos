import { getUsuarioFromEvent } from '../../../utils/getUsuario.js'
import { listarInvitacionesPendientes } from '../../../services/espacios.service.js'
import { db } from '../../../utils/db.js'
import { usuarios } from '../../../database/schema.js'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const usuarioId = await getUsuarioFromEvent(event)
  const [u] = await db
    .select({ email: usuarios.email })
    .from(usuarios)
    .where(eq(usuarios.id, usuarioId))
    .limit(1)
  return listarInvitacionesPendientes({ email: u?.email || '', usuarioId })
})
