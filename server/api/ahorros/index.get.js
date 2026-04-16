import { db } from '../../utils/db.js'
import { ahorros, mediosAhorro, metasAhorro } from '../../database/schema.js'
import { getUsuarioFromEvent } from '../../utils/getUsuario.js'
import { eq, and, sql, desc } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const mes = parseInt(query.mes) || (new Date().getMonth() + 1)
  const anio = parseInt(query.anio) || new Date().getFullYear()
  const usuarioId = await getUsuarioFromEvent(event)

  const ahorrosMes = await db
    .select({
      id: ahorros.id,
      medioAhorroId: ahorros.medioAhorroId,
      gastoPlanificadoId: ahorros.gastoPlanificadoId,
      gastoId: ahorros.gastoId,
      concepto: ahorros.concepto,
      monto: ahorros.monto,
      fecha: ahorros.fecha,
      mes: ahorros.mes,
      anio: ahorros.anio,
      notas: ahorros.notas,
      createdAt: ahorros.createdAt,
      medioNombre: mediosAhorro.nombre,
      medioIcono: mediosAhorro.icono,
      medioColor: mediosAhorro.color,
    })
    .from(ahorros)
    .leftJoin(mediosAhorro, eq(ahorros.medioAhorroId, mediosAhorro.id))
    .where(and(
      eq(ahorros.usuarioId, usuarioId),
      eq(ahorros.mes, mes),
      eq(ahorros.anio, anio),
    ))
    .orderBy(desc(ahorros.fecha))

  const [totalMesRow] = await db
    .select({ total: sql`COALESCE(SUM(${ahorros.monto}), 0)` })
    .from(ahorros)
    .where(and(
      eq(ahorros.usuarioId, usuarioId),
      eq(ahorros.mes, mes),
      eq(ahorros.anio, anio),
    ))

  const [totalGlobalRow] = await db
    .select({ total: sql`COALESCE(SUM(${ahorros.monto}), 0)` })
    .from(ahorros)
    .where(eq(ahorros.usuarioId, usuarioId))

  const porMedioRaw = await db
    .select({
      medioAhorroId: ahorros.medioAhorroId,
      total: sql`COALESCE(SUM(${ahorros.monto}), 0)`,
      medioNombre: mediosAhorro.nombre,
      medioIcono: mediosAhorro.icono,
      medioColor: mediosAhorro.color,
    })
    .from(ahorros)
    .leftJoin(mediosAhorro, eq(ahorros.medioAhorroId, mediosAhorro.id))
    .where(and(
      eq(ahorros.usuarioId, usuarioId),
      eq(ahorros.mes, mes),
      eq(ahorros.anio, anio),
    ))
    .groupBy(ahorros.medioAhorroId, mediosAhorro.nombre, mediosAhorro.icono, mediosAhorro.color)

  const [metaMensualRow] = await db
    .select()
    .from(metasAhorro)
    .where(and(
      eq(metasAhorro.usuarioId, usuarioId),
      eq(metasAhorro.tipo, 'mensual'),
      eq(metasAhorro.mes, mes),
      eq(metasAhorro.anio, anio),
    ))
    .limit(1)

  const [metaGlobalRow] = await db
    .select()
    .from(metasAhorro)
    .where(and(
      eq(metasAhorro.usuarioId, usuarioId),
      eq(metasAhorro.tipo, 'global'),
    ))
    .limit(1)

  // Serie últimos 6 meses
  const serie6 = []
  let m = mes, a = anio
  for (let i = 0; i < 6; i++) {
    const [row] = await db
      .select({ total: sql`COALESCE(SUM(${ahorros.monto}), 0)` })
      .from(ahorros)
      .where(and(
        eq(ahorros.usuarioId, usuarioId),
        eq(ahorros.mes, m),
        eq(ahorros.anio, a),
      ))
    serie6.unshift({ mes: m, anio: a, total: parseFloat(row.total) })
    m--
    if (m === 0) { m = 12; a-- }
  }

  const totalMes = parseFloat(totalMesRow.total)
  const totalGlobal = parseFloat(totalGlobalRow.total)
  const metaMensual = metaMensualRow ? parseFloat(metaMensualRow.montoObjetivo) : null
  const metaGlobal = metaGlobalRow ? parseFloat(metaGlobalRow.montoObjetivo) : null

  return {
    ahorros: ahorrosMes.map(a => ({ ...a, monto: parseFloat(a.monto) })),
    totalMes,
    totalGlobal,
    porMedio: porMedioRaw.map(p => ({
      ...p,
      total: parseFloat(p.total),
    })),
    metaMensual,
    metaGlobal,
    metaMensualId: metaMensualRow?.id || null,
    metaGlobalId: metaGlobalRow?.id || null,
    progresoMensual: metaMensual ? Math.min((totalMes / metaMensual) * 100, 100) : null,
    progresoGlobal: metaGlobal ? Math.min((totalGlobal / metaGlobal) * 100, 100) : null,
    serie6Meses: serie6,
  }
})
