// Recordatorios in-app para el usuario autenticado: gastos planificados que
// vencen mañana y deudas vencidas. Reemplaza el antiguo cron de Web Push;
// el cliente consulta este endpoint al abrir la app y muestra un banner.

import { db } from '../utils/db.js'
import {
  gastosPlanificados,
  planesMensuales,
  categorias,
  deudas,
  personasEntidades,
} from '../database/schema.js'
import { getUsuarioFromEvent } from '../utils/getUsuario.js'
import { getFechaHoraLocalUsuario } from '../utils/fechaLocal.js'
import { eq, and, lt, sql, isNull } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const usuarioId = await getUsuarioFromEvent(event)
  const { fecha: hoyStr } = await getFechaHoraLocalUsuario(usuarioId)

  const hoy = new Date(`${hoyStr}T00:00:00`)
  const manana = new Date(hoy)
  manana.setDate(hoy.getDate() + 1)
  const mananaStr = manana.toISOString().split('T')[0]

  setHeader(event, 'Cache-Control', 'private, max-age=60, stale-while-revalidate=300')

  const [planificados, deudasVencidas] = await Promise.all([
    db
      .select({
        id: gastosPlanificados.id,
        concepto: gastosPlanificados.concepto,
        monto: gastosPlanificados.montoEstimado,
        categoria: categorias.nombre,
      })
      .from(gastosPlanificados)
      .innerJoin(planesMensuales, eq(gastosPlanificados.planMensualId, planesMensuales.id))
      .leftJoin(categorias, eq(gastosPlanificados.categoriaId, categorias.id))
      .where(
        and(
          eq(planesMensuales.usuarioId, usuarioId),
          eq(gastosPlanificados.fechaProbablePago, mananaStr),
          eq(gastosPlanificados.estado, 'pendiente'),
        ),
      ),
    db
      .select({
        id: deudas.id,
        concepto: deudas.concepto,
        montoPendiente: deudas.montoPendiente,
        tipoDeuda: deudas.tipoDeuda,
        personaNombre: personasEntidades.nombre,
        fechaPago: deudas.fechaPago,
      })
      .from(deudas)
      .innerJoin(personasEntidades, eq(deudas.personaEntidadId, personasEntidades.id))
      .where(
        and(
          eq(deudas.usuarioId, usuarioId),
          isNull(deudas.deletedAt),
          lt(deudas.fechaPago, hoyStr),
          sql`${deudas.estado} IN ('pendiente', 'parcial')`,
        ),
      ),
  ])

  return {
    planificados: planificados.map((p) => ({ ...p, monto: parseFloat(p.monto) })),
    deudas: deudasVencidas.map((d) => ({ ...d, montoPendiente: parseFloat(d.montoPendiente) })),
    total: planificados.length + deudasVencidas.length,
  }
})
