import { db } from '../../utils/db.js'
import { ahorros, mediosAhorro, metasAhorro } from '../../database/schema.js'
import { getUsuarioFromEvent } from '../../utils/getUsuario.js'
import { getFechaHoraLocalUsuario } from '../../utils/fechaLocal.js'
import { eq, and, or, sql, desc } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const usuarioId = await getUsuarioFromEvent(event)
  const { fecha: fechaLocal } = await getFechaHoraLocalUsuario(usuarioId)
  const [anioLocal, mesLocal] = fechaLocal.split('-').map(Number)
  const mes = parseInt(query.mes) || mesLocal
  const anio = parseInt(query.anio) || anioLocal

  // SWR: ahorros cambian con cada depósito; 60s permite cache cross-tab
  // y PWA SW. Las mutaciones invalidan vía el composable.
  setHeader(event, 'Cache-Control', 'private, max-age=60, stale-while-revalidate=300')

  // Construir lista (mes, anio) de los últimos 6 meses para la serie.
  const periodos = []
  {
    let m = mes, a = anio
    for (let i = 0; i < 6; i++) {
      periodos.unshift({ mes: m, anio: a })
      m--
      if (m === 0) { m = 12; a-- }
    }
  }
  const serieCond = or(
    ...periodos.map(p => and(eq(ahorros.mes, p.mes), eq(ahorros.anio, p.anio)))
  )

  // Disparar todas las queries en paralelo. Antes había 8 round-trips
  // seriados (incluido un loop de 6 queries para serie6); ahora son
  // 6 paralelos + 1 agregado con GROUP BY para los 6 meses.
  const [
    ahorrosMes,
    totalMesRow,
    totalGlobalRow,
    porMedioRaw,
    metaMensualRow,
    metaGlobalRow,
    serie6Raw,
  ] = await Promise.all([
    db
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
      .orderBy(desc(ahorros.fecha)),

    db
      .select({ total: sql`COALESCE(SUM(${ahorros.monto}), 0)` })
      .from(ahorros)
      .where(and(
        eq(ahorros.usuarioId, usuarioId),
        eq(ahorros.mes, mes),
        eq(ahorros.anio, anio),
      )),

    db
      .select({ total: sql`COALESCE(SUM(${ahorros.monto}), 0)` })
      .from(ahorros)
      .where(eq(ahorros.usuarioId, usuarioId)),

    db
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
      .groupBy(ahorros.medioAhorroId, mediosAhorro.nombre, mediosAhorro.icono, mediosAhorro.color),

    db
      .select()
      .from(metasAhorro)
      .where(and(
        eq(metasAhorro.usuarioId, usuarioId),
        eq(metasAhorro.tipo, 'mensual'),
        eq(metasAhorro.mes, mes),
        eq(metasAhorro.anio, anio),
      ))
      .limit(1),

    db
      .select()
      .from(metasAhorro)
      .where(and(
        eq(metasAhorro.usuarioId, usuarioId),
        eq(metasAhorro.tipo, 'global'),
      ))
      .limit(1),

    db
      .select({
        mes: ahorros.mes,
        anio: ahorros.anio,
        total: sql`COALESCE(SUM(${ahorros.monto}), 0)`,
      })
      .from(ahorros)
      .where(and(eq(ahorros.usuarioId, usuarioId), serieCond))
      .groupBy(ahorros.mes, ahorros.anio),
  ])

  const totalMes = parseFloat(totalMesRow[0]?.total ?? 0)
  const totalGlobal = parseFloat(totalGlobalRow[0]?.total ?? 0)
  const meta1 = metaMensualRow[0]
  const meta2 = metaGlobalRow[0]
  const metaMensual = meta1 ? parseFloat(meta1.montoObjetivo) : null
  const metaGlobal = meta2 ? parseFloat(meta2.montoObjetivo) : null

  // Reconstruir la serie de 6 meses rellenando con 0 los meses sin datos.
  const serieMap = new Map()
  for (const row of serie6Raw) {
    serieMap.set(`${row.anio}-${row.mes}`, parseFloat(row.total))
  }
  const serie6Meses = periodos.map(p => ({
    mes: p.mes,
    anio: p.anio,
    total: serieMap.get(`${p.anio}-${p.mes}`) ?? 0,
  }))

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
    metaMensualId: meta1?.id || null,
    metaGlobalId: meta2?.id || null,
    progresoMensual: metaMensual ? Math.min((totalMes / metaMensual) * 100, 100) : null,
    progresoGlobal: metaGlobal ? Math.min((totalGlobal / metaGlobal) * 100, 100) : null,
    serie6Meses,
  }
})
