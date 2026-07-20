// Detección de gastos "potencialmente recurrentes" basada en el histórico
// real de gastos (no de planificados marcados como recurrentes).
//
// Heurística:
//   - Agrupa por (concepto normalizado, categoriaId)
//   - Cuenta meses distintos en los que aparece el mismo concepto en los
//     últimos N meses (default 6).
//   - Si aparece en >= 3 meses distintos, se considera "recurrente".
//   - Devuelve frecuencia, monto promedio, último monto, último mes y un
//     puntaje 0-100 de confianza (basado en regularidad y frescura).
//
// La idea: ofrecer al usuario candidatos para crear plantillas o gastos
// planificados recurrentes a partir de patrones reales en su histórico.
// Esto NO modifica ninguna tabla — es read-only.

import { db } from '../../utils/db.js'
import { gastos, categorias } from '../../database/schema.js'
import { getUsuarioFromEvent } from '../../utils/getUsuario.js'
import { getFechaHoraLocalUsuario } from '../../utils/fechaLocal.js'
import { eq, and, isNull, gte, sql } from 'drizzle-orm'

function normalizar(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export default defineEventHandler(async (event) => {
  const usuarioId = await getUsuarioFromEvent(event)
  const q = getQuery(event)
  const ventana = Math.min(Math.max(parseInt(q.meses) || 6, 3), 12)

  setHeader(event, 'Cache-Control', 'private, max-age=300, stale-while-revalidate=900')

  const { fecha: hoyStr } = await getFechaHoraLocalUsuario(usuarioId)
  const [anio, mes] = hoyStr.split('-').map(Number)
  const inicioMes = mes - (ventana - 1)
  let inicioAnio = anio
  let inicioMesAjustado = inicioMes
  while (inicioMesAjustado <= 0) {
    inicioMesAjustado += 12
    inicioAnio -= 1
  }
  const desde = `${inicioAnio}-${String(inicioMesAjustado).padStart(2, '0')}-01`

  // 1 sola query: traer (concepto, categoria, fecha, monto) de la ventana.
  // El agrupado por concepto normalizado se hace en JS porque PG no tiene
  // unaccent garantizado sin extensión.
  const rows = await db
    .select({
      concepto: gastos.concepto,
      monto: gastos.monto,
      fecha: gastos.fecha,
      categoriaId: gastos.categoriaId,
      categoriaNombre: categorias.nombre,
      categoriaIcono: categorias.icono,
      categoriaColor: categorias.color,
    })
    .from(gastos)
    .leftJoin(categorias, eq(gastos.categoriaId, categorias.id))
    .where(and(eq(gastos.usuarioId, usuarioId), isNull(gastos.deletedAt), gte(gastos.fecha, desde)))

  const grupos = new Map()
  for (const r of rows) {
    const key = `${normalizar(r.concepto)}|${r.categoriaId || ''}`
    if (!key.split('|')[0]) continue
    if (!grupos.has(key)) {
      grupos.set(key, {
        conceptoCanonico: r.concepto,
        categoriaId: r.categoriaId,
        categoriaNombre: r.categoriaNombre,
        categoriaIcono: r.categoriaIcono,
        categoriaColor: r.categoriaColor,
        ocurrencias: 0,
        montoTotal: 0,
        ultimoMonto: 0,
        ultimaFecha: '0000-00-00',
        mesesPresentes: new Set(),
      })
    }
    const g = grupos.get(key)
    const monto = parseFloat(r.monto) || 0
    g.ocurrencias += 1
    g.montoTotal += monto
    g.mesesPresentes.add(r.fecha.slice(0, 7))
    if (r.fecha > g.ultimaFecha) {
      g.ultimaFecha = r.fecha
      g.ultimoMonto = monto
    }
  }

  const candidatos = []
  for (const g of grupos.values()) {
    const mesesDistintos = g.mesesPresentes.size
    if (mesesDistintos < 3) continue
    const promedio = Math.round((g.montoTotal / g.ocurrencias) * 100) / 100
    // Confianza: regularidad (mesesDistintos / ventana) * 70 +
    //            frescura (último mes vs hoy) * 30
    const regularidad = mesesDistintos / ventana
    const ultMes = Number(g.ultimaFecha.slice(5, 7))
    const ultAnio = Number(g.ultimaFecha.slice(0, 4))
    const mesesAtras = (anio - ultAnio) * 12 + (mes - ultMes)
    const frescura = Math.max(0, 1 - mesesAtras / ventana)
    const confianza = Math.round((regularidad * 0.7 + frescura * 0.3) * 100)
    candidatos.push({
      concepto: g.conceptoCanonico,
      categoria: {
        id: g.categoriaId,
        nombre: g.categoriaNombre,
        icono: g.categoriaIcono,
        color: g.categoriaColor,
      },
      ocurrencias: g.ocurrencias,
      mesesDistintos,
      promedio,
      ultimoMonto: Math.round(g.ultimoMonto * 100) / 100,
      ultimaFecha: g.ultimaFecha,
      confianza,
    })
  }

  candidatos.sort((a, b) => b.confianza - a.confianza || b.promedio - a.promedio)

  return {
    ventanaMeses: ventana,
    desde,
    total: candidatos.length,
    candidatos,
  }
})
