import { db } from '../../utils/db.js'
import { gastos, categorias } from '../../database/schema.js'
import { getUsuarioFromEvent } from '../../utils/getUsuario.js'
import { getFechaHoraLocalUsuario } from '../../utils/fechaLocal.js'
import { rateLimits } from '../../utils/rateLimit.js'
import { tryIdempotentReplay, rememberIdempotent } from '../../utils/idempotency.js'
import { inArray } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const usuarioId = await getUsuarioFromEvent(event)
  // Si el cliente reintenta esta misma mutación (Idempotency-Key igual,
  // típico desde la cola offline), devolvemos la respuesta original sin
  // insertar gastos duplicados.
  const replay = tryIdempotentReplay(event, usuarioId)
  if (replay) return replay
  await rateLimits.bulkOp(event, usuarioId)
  const metodosPermitidos = new Set(['voz', 'foto', 'manual'])

  if (!body.gastos || !Array.isArray(body.gastos) || body.gastos.length === 0) {
    throw createError({ statusCode: 400, message: 'Se requiere un array de gastos' })
  }

  const { fecha: fechaLocal, hora: horaActual } = await getFechaHoraLocalUsuario(usuarioId)

  const metodoRegistro = metodosPermitidos.has(body.metodoRegistro)
    ? body.metodoRegistro
    : body.transcripcionVoz === 'Escaneado desde foto de voucher'
      ? 'foto'
      : 'voz'

  const valores = body.gastos.map((g) => ({
    usuarioId,
    categoriaId: g.categoriaId,
    concepto: g.concepto?.trim() || 'Gasto no especificado',
    monto: String(g.monto || 0),
    fecha: g.fecha || fechaLocal,
    hora: g.hora || horaActual,
    metodoRegistro,
    transcripcionVoz: body.transcripcionVoz || null,
    notas: g.notas || null,
  }))

  // Transacción atómica: si falla uno, se revierten todos
  const insertados = await db.transaction(async (tx) => {
    return await tx.insert(gastos).values(valores).returning()
  })

  // Get category info for all
  const catIds = [...new Set(insertados.map((g) => g.categoriaId))]
  const cats = await db.select().from(categorias).where(inArray(categorias.id, catIds))
  const catMap = Object.fromEntries(cats.map((c) => [c.id, c]))

  const respuesta = insertados.map((g) => ({
    ...g,
    monto: parseFloat(g.monto),
    categoriaNombre: catMap[g.categoriaId]?.nombre,
    categoriaIcono: catMap[g.categoriaId]?.icono,
    categoriaColor: catMap[g.categoriaId]?.color,
  }))
  rememberIdempotent(event, usuarioId, respuesta)
  return respuesta
})
