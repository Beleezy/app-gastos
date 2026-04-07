import { db } from '../../utils/db.js'
import { deudas, personasEntidades, pagosDeuda } from '../../database/schema.js'
import { getUsuarioFromEvent } from '../../utils/getUsuario.js'
import { eq, and, sql } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const usuarioId = await getUsuarioFromEvent(event)
  const query = getQuery(event)
  const personaId = query.personaId
  const tipo = query.tipo // 'me_deben' | 'yo_debo'
  const estado = query.estado // 'pendiente' | 'parcial' | 'pagado' | 'archivado'

  const conditions = [eq(deudas.usuarioId, usuarioId)]
  if (personaId) conditions.push(eq(deudas.personaEntidadId, personaId))
  if (tipo) conditions.push(eq(deudas.tipoDeuda, tipo))
  if (estado) conditions.push(eq(deudas.estado, estado))

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

  return deudasRaw.map(d => ({
    ...d,
    montoOriginal: parseFloat(d.montoOriginal),
    montoPendiente: parseFloat(d.montoPendiente),
  }))
})
