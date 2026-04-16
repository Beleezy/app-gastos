import { db } from '../../../utils/db.js'
import { mediosAhorro } from '../../../database/schema.js'
import { getUsuarioFromEvent } from '../../../utils/getUsuario.js'
import { eq, and, asc } from 'drizzle-orm'

const MEDIOS_DEFAULT = [
  { nombre: 'Yape', tipo: 'billetera_digital', icono: '📱', color: '#7C3AED' },
  { nombre: 'Plin', tipo: 'billetera_digital', icono: '💸', color: '#06B6D4' },
  { nombre: 'Cuenta bancaria', tipo: 'cuenta_bancaria', icono: '🏦', color: '#2563EB' },
  { nombre: 'Efectivo', tipo: 'efectivo', icono: '💵', color: '#16A34A' },
]

export default defineEventHandler(async (event) => {
  const usuarioId = await getUsuarioFromEvent(event)

  let medios = await db
    .select()
    .from(mediosAhorro)
    .where(eq(mediosAhorro.usuarioId, usuarioId))
    .orderBy(asc(mediosAhorro.orden), asc(mediosAhorro.nombre))

  if (medios.length === 0) {
    const values = MEDIOS_DEFAULT.map((m, i) => ({
      usuarioId,
      nombre: m.nombre,
      tipo: m.tipo,
      icono: m.icono,
      color: m.color,
      orden: i,
    }))
    medios = await db.insert(mediosAhorro).values(values).returning()
  }

  return medios.filter(m => m.activo)
})
