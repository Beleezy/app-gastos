// Histórico mensual para la página /metricas.
//
// Devuelve totales por mes de los últimos N meses (default 12) para:
//   - gastos
//   - ingresos
//   - ahorros
//
// Una sola query por concepto agrupada por (anio, mes) — N+1 evitado.
// Idempotente, cache 5 min: agregados mensuales cambian sólo cuando se
// registran nuevos movimientos del mes actual; los meses pasados son
// estables.
//
// Diseñado como módulo independiente: NO modifica los endpoints del home
// ni de registro/deudas. Una futura integración natural sería que la card
// "Gastos del mes" del home enlace acá y que /registro reutilice la serie
// mensual para mostrar comparativas más largas.

import { db } from '../../utils/db.js'
import { gastos, ingresos, ahorros } from '../../database/schema.js'
import { getUsuarioFromEvent } from '../../utils/getUsuario.js'
import { getFechaHoraLocalUsuario } from '../../utils/fechaLocal.js'
import { eq, and, isNull, gte, lte, sql } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const usuarioId = await getUsuarioFromEvent(event)
  const q = getQuery(event)
  const meses = Math.min(Math.max(parseInt(q.meses) || 12, 3), 24)

  setHeader(event, 'Cache-Control', 'private, max-age=300, stale-while-revalidate=900')

  const { fecha: hoyStr } = await getFechaHoraLocalUsuario(usuarioId)
  const [anio, mes] = hoyStr.split('-').map(Number)

  // Inicio = primer día del mes (hoy - meses + 1).
  const inicio = new Date(anio, mes - 1 - (meses - 1), 1)
  const fin = new Date(anio, mes, 0) // último día del mes actual

  const fmt = (d) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  const desde = fmt(inicio)
  const hasta = fmt(fin)

  const [gastosSerie, ingresosSerie, ahorrosSerie] = await Promise.all([
    // Gastos: agrupados por año-mes a partir de la columna `fecha` (date).
    db
      .select({
        anio: sql`EXTRACT(YEAR FROM ${gastos.fecha})::int`.as('anio'),
        mes: sql`EXTRACT(MONTH FROM ${gastos.fecha})::int`.as('mes'),
        total: sql`COALESCE(SUM(${gastos.monto}), 0)`.as('total'),
        cantidad: sql`COUNT(*)`.as('cantidad'),
      })
      .from(gastos)
      .where(
        and(
          eq(gastos.usuarioId, usuarioId),
          isNull(gastos.deletedAt),
          gte(gastos.fecha, desde),
          lte(gastos.fecha, hasta),
        ),
      )
      .groupBy(sql`EXTRACT(YEAR FROM ${gastos.fecha}), EXTRACT(MONTH FROM ${gastos.fecha})`),

    // Ingresos: misma idea.
    db
      .select({
        anio: sql`EXTRACT(YEAR FROM ${ingresos.fecha})::int`.as('anio'),
        mes: sql`EXTRACT(MONTH FROM ${ingresos.fecha})::int`.as('mes'),
        total: sql`COALESCE(SUM(${ingresos.monto}), 0)`.as('total'),
      })
      .from(ingresos)
      .where(
        and(
          eq(ingresos.usuarioId, usuarioId),
          isNull(ingresos.deletedAt),
          gte(ingresos.fecha, desde),
          lte(ingresos.fecha, hasta),
        ),
      )
      .groupBy(sql`EXTRACT(YEAR FROM ${ingresos.fecha}), EXTRACT(MONTH FROM ${ingresos.fecha})`),

    // Ahorros: la tabla guarda (mes, anio) explícitos.
    db
      .select({
        anio: ahorros.anio,
        mes: ahorros.mes,
        total: sql`COALESCE(SUM(${ahorros.monto}), 0)`.as('total'),
      })
      .from(ahorros)
      .where(eq(ahorros.usuarioId, usuarioId))
      .groupBy(ahorros.anio, ahorros.mes),
  ])

  // Construir el esqueleto mes a mes para que el cliente no tenga que
  // re-completar huecos (meses con 0 gastos).
  const periodos = []
  {
    let m = mes - (meses - 1)
    let a = anio
    while (m <= 0) {
      m += 12
      a -= 1
    }
    for (let i = 0; i < meses; i++) {
      periodos.push({ anio: a, mes: m })
      m += 1
      if (m === 13) {
        m = 1
        a += 1
      }
    }
  }

  function indexar(rows) {
    const out = new Map()
    for (const r of rows) out.set(`${r.anio}-${r.mes}`, r)
    return out
  }
  const gIdx = indexar(gastosSerie)
  const iIdx = indexar(ingresosSerie)
  const aIdx = indexar(ahorrosSerie)

  const serie = periodos.map((p) => {
    const k = `${p.anio}-${p.mes}`
    const g = parseFloat(gIdx.get(k)?.total || 0)
    const ing = parseFloat(iIdx.get(k)?.total || 0)
    const ah = parseFloat(aIdx.get(k)?.total || 0)
    return {
      anio: p.anio,
      mes: p.mes,
      gastos: Math.round(g * 100) / 100,
      ingresos: Math.round(ing * 100) / 100,
      ahorros: Math.round(ah * 100) / 100,
      saldoNeto: Math.round((ing - g) * 100) / 100,
      cantidadGastos: Number(gIdx.get(k)?.cantidad || 0),
    }
  })

  // Totales rápidos para no recalcular en el cliente.
  const totales = serie.reduce(
    (acc, m) => {
      acc.gastos += m.gastos
      acc.ingresos += m.ingresos
      acc.ahorros += m.ahorros
      return acc
    },
    { gastos: 0, ingresos: 0, ahorros: 0 },
  )

  // Promediar sobre meses CON actividad: con 8 meses en cero el promedio se
  // diluía (595/mes cuando los meses activos promediaban ~1,787) (UX-7).
  const mesesActivos =
    serie.filter((m) => m.gastos > 0 || m.ingresos > 0 || m.ahorros > 0).length || 1
  const promedios = {
    gastosMensual: Math.round((totales.gastos / mesesActivos) * 100) / 100,
    ingresosMensual: Math.round((totales.ingresos / mesesActivos) * 100) / 100,
    ahorrosMensual: Math.round((totales.ahorros / mesesActivos) * 100) / 100,
    mesesActivos,
  }

  return { meses, serie, totales, promedios }
})
