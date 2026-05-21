import { db } from '../../utils/db.js'
import { metas } from '../../database/schema.js'
import { getUsuarioFromEvent } from '../../utils/getUsuario.js'

const TIPOS_VALIDOS = new Set(['ahorro', 'deuda', 'gasto_limite'])

export default defineEventHandler(async (event) => {
  const usuarioId = await getUsuarioFromEvent(event)
  const body = await readBody(event)

  if (!body?.nombre || !String(body.nombre).trim()) {
    throw createError({ statusCode: 400, message: 'nombre es requerido' })
  }
  if (!TIPOS_VALIDOS.has(body.tipo)) {
    throw createError({ statusCode: 400, message: 'tipo inválido' })
  }
  const obj = Number(body.montoObjetivo)
  if (!(obj > 0)) {
    throw createError({ statusCode: 400, message: 'montoObjetivo debe ser > 0' })
  }
  if (body.fechaLimite && !/^\d{4}-\d{2}-\d{2}$/.test(body.fechaLimite)) {
    throw createError({ statusCode: 400, message: 'fechaLimite inválida' })
  }

  const [nueva] = await db
    .insert(metas)
    .values({
      usuarioId,
      nombre: String(body.nombre).trim().slice(0, 120),
      tipo: body.tipo,
      montoObjetivo: String(obj),
      fechaLimite: body.fechaLimite || null,
      icono: body.icono || '🎯',
      color: body.color || '#10b981',
      archivada: false,
    })
    .returning()

  return {
    ...nueva,
    montoObjetivo: parseFloat(nueva.montoObjetivo),
    progreso: 0,
    countMovs: 0,
  }
})
