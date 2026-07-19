import { db } from '../../utils/db.js'
import { presupuestosCategoria, categorias, gastos } from '../../database/schema.js'
import { getUsuarioFromEvent } from '../../utils/getUsuario.js'
import { getFechaHoraLocalUsuario } from '../../utils/fechaLocal.js'
import { eq, and, between, isNull, sql } from 'drizzle-orm'

// Devuelve por cada presupuesto: monto, consumo del mes, % usado, estado.
// Una sola query con LEFT JOIN agregado para evitar N+1.
export default defineEventHandler(async (event) => {
  const usuarioId = await getUsuarioFromEvent(event)
  const q = getQuery(event)
  const { fecha: hoyStr } = await getFechaHoraLocalUsuario(usuarioId)
  const [anioLocal, mesLocal] = hoyStr.split('-').map(Number)
  const mes = parseInt(q.mes) || mesLocal
  const anio = parseInt(q.anio) || anioLocal

  setHeader(event, 'Cache-Control', 'private, max-age=30, stale-while-revalidate=180')

  const primerDia = `${anio}-${String(mes).padStart(2, '0')}-01`
  const ultimoDiaNum = new Date(anio, mes, 0).getDate()
  const ultimaFecha = `${anio}-${String(mes).padStart(2, '0')}-${String(ultimoDiaNum).padStart(2, '0')}`

  const rows = await db
    .select({
      categoriaId: presupuestosCategoria.categoriaId,
      categoriaNombre: categorias.nombre,
      categoriaIcono: categorias.icono,
      categoriaColor: categorias.color,
      montoMensual: presupuestosCategoria.montoMensual,
      alertaUmbral: presupuestosCategoria.alertaUmbral,
      consumido:
        sql`COALESCE(SUM(CASE WHEN ${gastos.fecha} BETWEEN ${primerDia} AND ${ultimaFecha} AND ${gastos.deletedAt} IS NULL THEN ${gastos.monto} END), 0)`.as(
          'consumido',
        ),
    })
    .from(presupuestosCategoria)
    .innerJoin(categorias, eq(categorias.id, presupuestosCategoria.categoriaId))
    .leftJoin(
      gastos,
      and(
        eq(gastos.categoriaId, presupuestosCategoria.categoriaId),
        eq(gastos.usuarioId, usuarioId),
      ),
    )
    .where(eq(presupuestosCategoria.usuarioId, usuarioId))
    .groupBy(
      presupuestosCategoria.categoriaId,
      presupuestosCategoria.montoMensual,
      presupuestosCategoria.alertaUmbral,
      categorias.nombre,
      categorias.icono,
      categorias.color,
    )

  return rows.map((r) => {
    const monto = parseFloat(r.montoMensual)
    const consumido = parseFloat(r.consumido)
    const pct = monto > 0 ? (consumido / monto) * 100 : 0
    const umbral = Number(r.alertaUmbral) || 80
    const estado = pct >= 100 ? 'critico' : pct >= umbral ? 'alerta' : 'ok'
    return {
      categoriaId: r.categoriaId,
      categoriaNombre: r.categoriaNombre,
      categoriaIcono: r.categoriaIcono,
      categoriaColor: r.categoriaColor,
      montoMensual: monto,
      alertaUmbral: umbral,
      consumido,
      porcentaje: Math.round(pct * 100) / 100,
      estado,
    }
  })
})
