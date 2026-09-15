import { db } from '../../../../utils/db.js'
import {
  vinculosCheckpoints,
  personasEntidades,
  auditoriaVinculos,
  usuarios,
  configuraciones,
} from '../../../../database/schema.js'
import { getUsuarioFromEvent } from '../../../../utils/getUsuario.js'
import { normalizarParPersonas, agruparAuditoriaPorCheckpoint } from '../../../../utils/vinculos.js'
import { eq, and, or, gte, asc, inArray } from 'drizzle-orm'
import { validateQuery } from '../../../../utils/validate.js'
import { checkpointsQuerySchema } from '~/shared/schemas/deudas.js'

export default defineEventHandler(async (event) => {
  const usuarioId = await getUsuarioFromEvent(event)
  // `personaId` iba crudo del query string a un `eq()` contra uuid.
  const { personaId } = validateQuery(event, checkpointsQuerySchema)
  setHeader(event, 'Cache-Control', 'private, max-age=300, stale-while-revalidate=1800')

  // Verificar que la persona pertenece al usuario
  const [persona] = await db
    .select()
    .from(personasEntidades)
    .where(and(eq(personasEntidades.id, personaId), eq(personasEntidades.usuarioId, usuarioId)))
    .limit(1)

  if (!persona) {
    throw createError({ statusCode: 404, message: 'Persona no encontrada' })
  }

  if (!persona.vinculadoUsuarioId || !persona.vinculoParId) {
    // No link active - return empty instead of error so UI doesn't break
    return []
  }

  const parPersonaId = persona.vinculoParId

  const { personaAId } = normalizarParPersonas(personaId, parPersonaId)

  // Obtener todos los checkpoints del par (also try with personaId directly as fallback)
  let checkpoints = await db
    .select()
    .from(vinculosCheckpoints)
    .where(eq(vinculosCheckpoints.personaAId, personaAId))
    .orderBy(asc(vinculosCheckpoints.createdAt))

  // Fallback: try searching with personaId directly (in case normalization was different at creation time)
  if (checkpoints.length === 0 && personaAId !== personaId) {
    checkpoints = await db
      .select()
      .from(vinculosCheckpoints)
      .where(eq(vinculosCheckpoints.personaAId, personaId))
      .orderBy(asc(vinculosCheckpoints.createdAt))
  }

  if (checkpoints.length === 0) return []

  // Toda la auditoría del par desde el primer checkpoint, en UNA query, y
  // los nombres de los actores en OTRA. Antes era una query por checkpoint
  // y dos por entrada (configuraciones + usuarios): con cinco checkpoints
  // de veinte entradas, más de doscientos round trips para pintar la
  // lista. La partición entre checkpoints se hace en memoria
  // (`agruparAuditoriaPorCheckpoint`).
  const entradas = await db
    .select({
      id: auditoriaVinculos.id,
      accion: auditoriaVinculos.accion,
      descripcion: auditoriaVinculos.descripcion,
      datos: auditoriaVinculos.datos,
      createdAt: auditoriaVinculos.createdAt,
      usuarioId: auditoriaVinculos.usuarioId,
    })
    .from(auditoriaVinculos)
    .where(
      and(
        or(
          eq(auditoriaVinculos.personaAId, personaId),
          eq(auditoriaVinculos.personaBId, personaId),
          eq(auditoriaVinculos.personaAId, parPersonaId),
          eq(auditoriaVinculos.personaBId, parPersonaId),
        ),
        gte(auditoriaVinculos.createdAt, new Date(checkpoints[0].createdAt)),
      ),
    )
    .orderBy(asc(auditoriaVinculos.createdAt))

  const actores = [...new Set(entradas.map((e) => e.usuarioId).filter(Boolean))]
  const filasNombres = actores.length
    ? await db
        .select({
          id: usuarios.id,
          nombre: usuarios.nombre,
          nombreConfig: configuraciones.nombre,
        })
        .from(usuarios)
        .leftJoin(configuraciones, eq(configuraciones.usuarioId, usuarios.id))
        .where(inArray(usuarios.id, actores))
    : []
  // Misma prioridad que getNombreDisplay: configuraciones.nombre → usuarios.nombre.
  const nombrePorActor = new Map(
    filasNombres.map((f) => [f.id, f.nombreConfig?.trim() || f.nombre?.trim() || 'Usuario']),
  )

  const grupos = agruparAuditoriaPorCheckpoint(checkpoints, entradas)

  return checkpoints.map((cp, i) => ({
    id: cp.id,
    tipo: cp.tipo,
    descripcion: cp.descripcion,
    createdAt: cp.createdAt,
    creadoPorId: cp.creadoPorId,
    snapshotResumen: calcularResumenSnapshot(cp.snapshotDatos),
    auditoria: grupos[i].map((entrada) => ({
      ...entrada,
      datos: entrada.datos ? JSON.parse(entrada.datos) : null,
      nombreActor: nombrePorActor.get(entrada.usuarioId) || 'Usuario',
      esTuyo: entrada.usuarioId === usuarioId,
    })),
  }))
})

/**
 * Calcula un resumen del snapshot sin devolver todos los datos raw
 */
function calcularResumenSnapshot(snapshotDatosStr) {
  try {
    const data = JSON.parse(snapshotDatosStr)
    const deudasA = data.personaA?.deudas || []
    const deudasB = data.personaB?.deudas || []

    const totalA = deudasA.reduce((s, d) => s + parseFloat(d.montoPendiente || 0), 0)
    const totalB = deudasB.reduce((s, d) => s + parseFloat(d.montoPendiente || 0), 0)
    const totalPagosA = deudasA.reduce((s, d) => s + (d.pagos?.length || 0), 0)
    const totalPagosB = deudasB.reduce((s, d) => s + (d.pagos?.length || 0), 0)

    return {
      personaANombre: data.personaA?.nombre || null,
      personaBNombre: data.personaB?.nombre || null,
      totalDeudasA: deudasA.length,
      totalDeudasB: deudasB.length,
      totalPendienteA: Math.round(totalA * 100) / 100,
      totalPendienteB: Math.round(totalB * 100) / 100,
      totalPagosA,
      totalPagosB,
      fechaSnapshot: data.fechaSnapshot || null,
    }
  } catch {
    return null
  }
}
