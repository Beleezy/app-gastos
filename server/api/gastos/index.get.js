import { db } from '../../utils/db.js'
import { gastos, categorias } from '../../database/schema.js'
import { getUsuarioFromEvent } from '../../utils/getUsuario.js'
import { eq, and, between, sql, desc, ilike, asc } from 'drizzle-orm'
import { escapeLikePattern, sanitizeString } from '../../utils/sqlSafe.js'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const usuarioId = await getUsuarioFromEvent(event)

  const { fecha, fechaDesde, fechaHasta, mes, anio, busqueda, categoriaId, limit, offset, orden } = query

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

  // Búsqueda por concepto — escapa `%`/`_` para evitar que un input
  // como "%" matchee todo y filtra controles/zero-width.
  const busquedaSan = sanitizeString(busqueda, 100)
  if (busquedaSan) {
    whereConditions.push(ilike(gastos.concepto, `%${escapeLikePattern(busquedaSan)}%`))
  }

  // Filtro por categoría
  if (categoriaId) {
    whereConditions.push(eq(gastos.categoriaId, categoriaId))
  }

  // Ordenamiento
  let orderBy = [desc(gastos.fecha), desc(gastos.hora)]
  if (orden === 'monto_asc') orderBy = [asc(gastos.monto)]
  else if (orden === 'monto_desc') orderBy = [desc(gastos.monto)]
  else if (orden === 'concepto_asc') orderBy = [asc(gastos.concepto)]
  else if (orden === 'fecha_asc') orderBy = [asc(gastos.fecha), asc(gastos.hora)]

  let queryBuilder = db
    .select({
      id: gastos.id,
      concepto: gastos.concepto,
      monto: gastos.monto,
      fecha: gastos.fecha,
      hora: gastos.hora,
      metodoRegistro: gastos.metodoRegistro,
      transcripcionVoz: gastos.transcripcionVoz,
      notas: gastos.notas,
      gastoPlanificadoId: gastos.gastoPlanificadoId,
      categoriaId: gastos.categoriaId,
      categoriaNombre: categorias.nombre,
      categoriaIcono: categorias.icono,
      categoriaColor: categorias.color,
      createdAt: gastos.createdAt,
    })
    .from(gastos)
    .leftJoin(categorias, eq(gastos.categoriaId, categorias.id))
    .where(and(...whereConditions))
    .orderBy(...orderBy)

  // Paginación
  if (limit) {
    queryBuilder = queryBuilder.limit(Number(limit))
  }
  if (offset) {
    queryBuilder = queryBuilder.offset(Number(offset))
  }

  const result = await queryBuilder

  return result.map(g => ({
    ...g,
    monto: parseFloat(g.monto),
  }))
})
