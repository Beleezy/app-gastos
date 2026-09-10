import { db } from '../../utils/db.js'
import { deudas, personasEntidades, pagosDeuda } from '../../database/schema.js'
import { getUsuarioFromEvent } from '../../utils/getUsuario.js'
import { eq, and, sql, isNull } from 'drizzle-orm'
import { validateQuery } from '../../utils/validate.js'
import { deudasListQuerySchema } from '~/shared/schemas/deudas.js'

export default defineEventHandler(async (event) => {
  const usuarioId = await getUsuarioFromEvent(event)

  // `personaId` iba crudo a un `eq()` contra una columna uuid y
  // `tipo`/`estado` contra columnas enum de Postgres: `?personaId=abc` o
  // `?estado=basura` devolvían un 500 con la consulta dentro. Los dos enums
  // ya estaban escritos en `shared/schemas/deudas.js` sin usarse.
  const query = validateQuery(event, deudasListQuerySchema)
  const { personaId, tipo, estado } = query

  const conditions = [eq(deudas.usuarioId, usuarioId), isNull(deudas.deletedAt)]
  if (personaId) conditions.push(eq(deudas.personaEntidadId, personaId))
  if (tipo) conditions.push(eq(deudas.tipoDeuda, tipo))
  if (estado) conditions.push(eq(deudas.estado, estado))

  // Paginación: default 200, máx 500. Suficiente para casi todos los
  // usuarios y evita cargar miles de filas si alguien acumula deudas.
  const limit = Math.min(parseInt(query.limit) || 200, 500)
  const offset = Math.max(parseInt(query.offset) || 0, 0)

  const deudasRaw = await db
    .select({
      id: deudas.id,
      personaEntidadId: deudas.personaEntidadId,
      tipoDeuda: deudas.tipoDeuda,
      concepto: deudas.concepto,
      montoOriginal: deudas.montoOriginal,
      montoPendiente: deudas.montoPendiente,
      fechaCreacion: deudas.fechaCreacion,
      fechaPago: deudas.fechaPago,
      estado: deudas.estado,
      notas: deudas.notas,
      createdAt: deudas.createdAt,
      updatedAt: deudas.updatedAt,
      personaNombre: personasEntidades.nombre,
      personaTipo: personasEntidades.tipo,
    })
    .from(deudas)
    .leftJoin(personasEntidades, eq(deudas.personaEntidadId, personasEntidades.id))
    .where(and(...conditions))
    .orderBy(sql`${deudas.createdAt} DESC`)
    .limit(limit)
    .offset(offset)

  return deudasRaw.map((d) => ({
    ...d,
    montoOriginal: parseFloat(d.montoOriginal),
    montoPendiente: parseFloat(d.montoPendiente),
  }))
})
