import { db } from '../../utils/db.js'
import { gastos, categorias } from '../../database/schema.js'
import { getUsuarioId } from '../../utils/getUsuario.js'
import { eq, inArray } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const usuarioId = await getUsuarioId()

  if (!body.gastos || !Array.isArray(body.gastos) || body.gastos.length === 0) {
    throw createError({ statusCode: 400, message: 'Se requiere un array de gastos' })
  }

  const ahora = new Date()
  const horaActual = ahora.toTimeString().split(' ')[0].substring(0, 5)

  const valores = body.gastos.map(g => ({
    usuarioId,
    categoriaId: g.categoriaId,
    concepto: g.concepto?.trim() || 'Gasto no especificado',
    monto: String(g.monto || 0),
    fecha: g.fecha || ahora.toISOString().split('T')[0],
    hora: g.hora || horaActual,
    metodoRegistro: 'voz',
    transcripcionVoz: body.transcripcionVoz || null,
    notas: g.notas || null,
  }))

  // Transacción atómica: si falla uno, se revierten todos
  const insertados = await db.transaction(async (tx) => {
    return await tx
      .insert(gastos)
      .values(valores)
      .returning()
  })

  // Get category info for all
  const catIds = [...new Set(insertados.map(g => g.categoriaId))]
  const cats = await db.select().from(categorias).where(inArray(categorias.id, catIds))
  const catMap = Object.fromEntries(cats.map(c => [c.id, c]))

  return insertados.map(g => ({
    ...g,
    monto: parseFloat(g.monto),
    categoriaNombre: catMap[g.categoriaId]?.nombre,
    categoriaIcono: catMap[g.categoriaId]?.icono,
    categoriaColor: catMap[g.categoriaId]?.color,
  }))
})
