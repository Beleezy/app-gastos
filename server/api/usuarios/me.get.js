// Perfil del usuario autenticado: incluye rol y estado de acceso para que el
// cliente sepa si mostrar el panel de superadministrador.

import { db } from '../../utils/db.js'
import { usuarios } from '../../database/schema.js'
import { getUsuarioFromEvent } from '../../utils/getUsuario.js'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const userId = await getUsuarioFromEvent(event)
  const [row] = await db
    .select({
      id: usuarios.id,
      nombre: usuarios.nombre,
      email: usuarios.email,
      rol: usuarios.rol,
      permitido: usuarios.permitido,
    })
    .from(usuarios)
    .where(eq(usuarios.id, userId))
    .limit(1)
  return row || null
})
