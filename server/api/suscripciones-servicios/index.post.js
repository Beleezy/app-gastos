import { db } from '../../utils/db.js'
import { suscripcionesServicios } from '../../database/schema.js'
import { getUsuarioFromEvent } from '../../utils/getUsuario.js'

const PERIODICIDADES_VALIDAS = new Set([
  'semanal', 'quincenal', 'mensual', 'bimestral',
  'trimestral', 'semestral', 'anual',
])

export default defineEventHandler(async (event) => {
  const usuarioId = await getUsuarioFromEvent(event)
  const body = await readBody(event)

  if (!body?.nombre || !String(body.nombre).trim()) {
    throw createError({ statusCode: 400, message: 'nombre es requerido' })
  }
  const monto = Number(body.monto)
  if (!(monto > 0)) {
    throw createError({ statusCode: 400, message: 'monto debe ser > 0' })
  }
  if (body.periodicidad && !PERIODICIDADES_VALIDAS.has(body.periodicidad)) {
    throw createError({ statusCode: 400, message: 'periodicidad inválida' })
  }
  if (!body.fechaInicio || !/^\d{4}-\d{2}-\d{2}$/.test(body.fechaInicio)) {
    throw createError({ statusCode: 400, message: 'fechaInicio inválida (YYYY-MM-DD)' })
  }

  const [nueva] = await db
    .insert(suscripcionesServicios)
    .values({
      usuarioId,
      nombre: String(body.nombre).trim().slice(0, 120),
      monto: String(monto),
      periodicidad: body.periodicidad || 'mensual',
      fechaInicio: body.fechaInicio,
      categoriaId: body.categoriaId || null,
      icono: body.icono || '🔁',
      color: body.color || '#3b82f6',
      url: body.url || null,
      notas: body.notas || null,
      activa: body.activa !== false,
    })
    .returning()

  return { ...nueva, monto: parseFloat(nueva.monto) }
})
