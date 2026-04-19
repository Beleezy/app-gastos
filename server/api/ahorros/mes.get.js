import { db } from '../../utils/db.js'
import { ahorros, mediosAhorro } from '../../database/schema.js'
import { getUsuarioFromEvent } from '../../utils/getUsuario.js'
import { eq, and, desc } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const usuarioId = await getUsuarioFromEvent(event)
  const mes = parseInt(query.mes)
  const anio = parseInt(query.anio)

  if (!mes || mes < 1 || mes > 12 || !anio || anio < 2000 || anio > 3000) {
    throw createError({ statusCode: 400, statusMessage: 'Parámetros mes/anio inválidos' })
  }

  const rows = await db
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

  return rows.map(a => ({ ...a, monto: parseFloat(a.monto) }))
})
