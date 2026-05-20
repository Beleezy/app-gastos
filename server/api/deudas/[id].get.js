import { db } from '../../utils/db.js'
import { deudas, personasEntidades } from '../../database/schema.js'
import { getUsuarioFromEvent } from '../../utils/getUsuario.js'
import { eq, and, isNull } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const usuarioId = await getUsuarioFromEvent(event)
  setHeader(event, 'Cache-Control', 'private, max-age=60, stale-while-revalidate=300')

  const [deuda] = await db
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
      vinculoDeudaId: deudas.vinculoDeudaId,
      createdAt: deudas.createdAt,
      updatedAt: deudas.updatedAt,
      personaNombre: personasEntidades.nombre,
      personaTipo: personasEntidades.tipo,
    })
    .from(deudas)
    .leftJoin(personasEntidades, eq(deudas.personaEntidadId, personasEntidades.id))
    .where(and(eq(deudas.id, id), eq(deudas.usuarioId, usuarioId), isNull(deudas.deletedAt)))
    .limit(1)

  if (!deuda) {
    throw createError({ statusCode: 404, message: 'Deuda no encontrada' })
  }

  return {
    ...deuda,
    montoOriginal: parseFloat(deuda.montoOriginal),
    montoPendiente: parseFloat(deuda.montoPendiente),
  }
})
