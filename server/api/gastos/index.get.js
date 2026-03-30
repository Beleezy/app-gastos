import { db } from '../../utils/db.js'
import { gastos, categorias } from '../../database/schema.js'
import { getUsuarioId } from '../../utils/getUsuario.js'
import { eq, and, between, sql, desc } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const usuarioId = await getUsuarioId()

  const { fecha, fechaDesde, fechaHasta, mes, anio } = query

  let whereConditions = [eq(gastos.usuarioId, usuarioId)]

  if (fecha) {
    whereConditions.push(eq(gastos.fecha, fecha))
  } else if (fechaDesde && fechaHasta) {
    whereConditions.push(between(gastos.fecha, fechaDesde, fechaHasta))
  } else if (mes && anio) {
    const primerDia = `${anio}-${String(mes).padStart(2, '0')}-01`
    const ultimoDia = new Date(Number(anio), Number(mes), 0).getDate()
    const ultimaFecha = `${anio}-${String(mes).padStart(2, '0')}-${String(ultimoDia).padStart(2, '0')}`
    whereConditions.push(between(gastos.fecha, primerDia, ultimaFecha))
  }

  const result = await db
    .select({
      id: gastos.id,
      concepto: gastos.concepto,
      monto: gastos.monto,
      fecha: gastos.fecha,
      hora: gastos.hora,
      metodoRegistro: gastos.metodoRegistro,
      transcripcionVoz: gastos.transcripcionVoz,
      notas: gastos.notas,
      categoriaId: gastos.categoriaId,
      categoriaNombre: categorias.nombre,
      categoriaIcono: categorias.icono,
      categoriaColor: categorias.color,
      createdAt: gastos.createdAt,
    })
    .from(gastos)
    .leftJoin(categorias, eq(gastos.categoriaId, categorias.id))
    .where(and(...whereConditions))
    .orderBy(desc(gastos.fecha), desc(gastos.hora))

  return result.map(g => ({
    ...g,
    monto: parseFloat(g.monto),
  }))
})
