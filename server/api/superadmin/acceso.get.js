// Datos del panel de control de acceso (solo superadmin):
// intenciones de registro (pendientes + historial) y usuarios del sistema.

import { db } from '../../utils/db.js'
import { intencionesRegistro, usuarios } from '../../database/schema.js'
import { requireSuperadmin } from '../../utils/getUsuario.js'
import { desc } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  await requireSuperadmin(event)
  const [intenciones, listaUsuarios] = await Promise.all([
    db.select().from(intencionesRegistro).orderBy(desc(intencionesRegistro.createdAt)),
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
  return { intenciones, usuarios: listaUsuarios }
})
