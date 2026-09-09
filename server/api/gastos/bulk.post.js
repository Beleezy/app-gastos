import { db } from '../../utils/db.js'
import { gastos, categorias } from '../../database/schema.js'
import { getUsuarioFromEvent } from '../../utils/getUsuario.js'
import { getFechaHoraLocalUsuario } from '../../utils/fechaLocal.js'
import { rateLimits } from '../../utils/rateLimit.js'
import { tryIdempotentReplay, rememberIdempotent } from '../../utils/idempotency.js'
import { validateBody } from '../../utils/validate.js'
import { assertCategoriasPropias } from '../../utils/categorias.js'
import { gastosBulkCreateSchema } from '~/shared/schemas/gastos.js'
import { inArray } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const usuarioId = await getUsuarioFromEvent(event)
  // Si el cliente reintenta esta misma mutación (Idempotency-Key igual,
  // típico desde la cola offline), devolvemos la respuesta original sin
  // insertar gastos duplicados.
  const replay = tryIdempotentReplay(event, usuarioId)
  if (replay) return replay
  await rateLimits.bulkOp(event, usuarioId)

  // `gastosBulkCreateSchema` existía en shared/schemas/gastos.js desde que
  // se escribió el módulo, pero este handler leía `readBody` crudo y nunca
  // lo usaba: un monto no numérico, una fecha inventada o un categoriaId
  // nulo llegaban a Postgres y salían como 500 con el error del driver, en
  // vez de un 400 explicando qué campo está mal.
  const body = await validateBody(event, gastosBulkCreateSchema)

  const metodosPermitidos = new Set(['voz', 'foto', 'manual'])

  const { fecha: fechaLocal, hora: horaActual } = await getFechaHoraLocalUsuario(usuarioId)

  // Misma regla que en POST /api/gastos: una categoría ajena no se guarda.
  await assertCategoriasPropias({
    usuarioId,
    categoriaIds: body.gastos.map((g) => g.categoriaId),
  })

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
    visibilidad: g.visibilidad || 'auto',
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
