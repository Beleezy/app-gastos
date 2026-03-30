import { db } from '../../utils/db.js'
import { gastos, categorias } from '../../database/schema.js'
import { getUsuarioId } from '../../utils/getUsuario.js'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const usuarioId = await getUsuarioId()

  if (!body.concepto?.trim()) {
    throw createError({ statusCode: 400, message: 'El concepto es obligatorio' })
  }
  if (!body.monto || body.monto <= 0) {
    throw createError({ statusCode: 400, message: 'El monto debe ser mayor a 0' })
  }
  if (!body.categoriaId) {
    throw createError({ statusCode: 400, message: 'La categoría es obligatoria' })
  }

  const ahora = new Date()
  const fechaHoy = body.fecha || ahora.toISOString().split('T')[0]
  const horaActual = body.hora || ahora.toTimeString().split(' ')[0].substring(0, 5)

  const [gasto] = await db
    .insert(gastos)
    .values({
      usuarioId,
      categoriaId: body.categoriaId,
      concepto: body.concepto.trim(),
      monto: String(body.monto),
      fecha: fechaHoy,
      hora: horaActual,
      metodoRegistro: body.metodoRegistro || 'manual',
      transcripcionVoz: body.transcripcionVoz || null,
      notas: body.notas || null,
    })
    .returning()

  const [cat] = await db.select().from(categorias).where(eq(categorias.id, gasto.categoriaId)).limit(1)

  return {
    ...gasto,
    monto: parseFloat(gasto.monto),
    categoriaNombre: cat?.nombre,
    categoriaIcono: cat?.icono,
    categoriaColor: cat?.color,
  }
})
