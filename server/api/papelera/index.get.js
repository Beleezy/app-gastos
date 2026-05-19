// GET /api/papelera — lista los registros eliminados (soft-delete)
// agrupados por entidad. Sirve para el módulo de "Recuperar". Las filas
// se purgan físicamente a los 30 días vía /api/cron/purgar-papelera.

import { db } from '../../utils/db.js'
import { gastos, deudas, pagosDeuda, categorias } from '../../database/schema.js'
import { getUsuarioFromEvent } from '../../utils/getUsuario.js'
import { eq, and, sql, desc } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const usuarioId = await getUsuarioFromEvent(event)
  const query = getQuery(event)
  const limit = Math.min(Number(query.limit) || 100, 200)

  const [gastosBorrados, deudasBorradas] = await Promise.all([
    db
      .select({
        id: gastos.id,
        concepto: gastos.concepto,
        monto: gastos.monto,
        fecha: gastos.fecha,
        deletedAt: gastos.deletedAt,
        categoriaNombre: categorias.nombre,
        categoriaIcono: categorias.icono,
      })
      .from(gastos)
      .leftJoin(categorias, eq(gastos.categoriaId, categorias.id))
      .where(and(eq(gastos.usuarioId, usuarioId), sql`${gastos.deletedAt} IS NOT NULL`))
      .orderBy(desc(gastos.deletedAt))
      .limit(limit),

    db
      .select({
        id: deudas.id,
        concepto: deudas.concepto,
        montoPendiente: deudas.montoPendiente,
        tipoDeuda: deudas.tipoDeuda,
        deletedAt: deudas.deletedAt,
      })
      .from(deudas)
      .where(and(eq(deudas.usuarioId, usuarioId), sql`${deudas.deletedAt} IS NOT NULL`))
      .orderBy(desc(deudas.deletedAt))
      .limit(limit),
  ])

  return {
    gastos: gastosBorrados.map((g) => ({ ...g, monto: parseFloat(g.monto) })),
    deudas: deudasBorradas.map((d) => ({ ...d, montoPendiente: parseFloat(d.montoPendiente) })),
  }
})
