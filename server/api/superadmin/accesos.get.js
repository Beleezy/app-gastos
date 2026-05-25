// Lista la allowlist de correos y los usuarios del sistema. Solo superadmin.

import { db } from '../../utils/db.js'
import { accesosPermitidos, usuarios } from '../../database/schema.js'
import { requireSuperadmin } from '../../utils/getUsuario.js'
import { desc } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  await requireSuperadmin(event)
  const [permitidos, listaUsuarios] = await Promise.all([
    db.select().from(accesosPermitidos).orderBy(desc(accesosPermitidos.createdAt)),
    db
      .select({
        id: usuarios.id,
        nombre: usuarios.nombre,
        email: usuarios.email,
        rol: usuarios.rol,
        permitido: usuarios.permitido,
      })
      .from(usuarios)
      .orderBy(desc(usuarios.createdAt)),
  ])
  return { permitidos, usuarios: listaUsuarios }
})
