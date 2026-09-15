import { and, eq } from 'drizzle-orm'
import { db } from '../../../../../../utils/db.js'
import {
  gastosFuturos,
  gastosFuturosDetalles,
  gastosFuturosOpciones,
  gastos,
  gastosPlanificados,
} from '../../../../../../database/schema.js'
import { getUsuarioFromEvent } from '../../../../../../utils/getUsuario.js'
import { getFechaHoraLocalUsuario } from '../../../../../../utils/fechaLocal.js'
import { fetchFutureExpenseById } from '../../../../../../utils/gastosFuturos.js'
import { obtenerOCrearPlan } from '../../../../../../utils/recurrente.js'
import { getUuidParam } from '../../../../../../utils/params.js'
import { validateBody } from '../../../../../../utils/validate.js'
import { decisionFuturoSchema } from '~/shared/schemas/planificador.js'

export default defineEventHandler(async (event) => {
  const proyectoId = getUuidParam(event, 'id', { recurso: 'Proyecto' })
  const detalleId = getUuidParam(event, 'detalleId', { recurso: 'Detalle' })
  const usuarioId = await getUsuarioFromEvent(event)

  // `opcionId` iba crudo a un `eq()` contra uuid y `fecha` a una columna
  // date: "abc" y "el martes" eran un 500 con la consulta dentro.
  const body = await validateBody(event, decisionFuturoSchema)
  const { tipo, opcionId } = body
  const monto = Math.round((body.monto + Number.EPSILON) * 100) / 100
  const notas = body.notas?.trim() || null

  const [proyecto] = await db
    .select()
    .from(gastosFuturos)
    .where(and(eq(gastosFuturos.id, proyectoId), eq(gastosFuturos.usuarioId, usuarioId)))
    .limit(1)

  if (!proyecto) {
    throw createError({ statusCode: 404, message: 'Gasto futuro no encontrado' })
  }

  const [detalle] = await db
    .select()
    .from(gastosFuturosDetalles)
    .where(
      and(
        eq(gastosFuturosDetalles.id, detalleId),
        eq(gastosFuturosDetalles.gastoFuturoId, proyectoId),
      ),
    )
    .limit(1)

  if (!detalle) {
    throw createError({ statusCode: 404, message: 'Detalle no encontrado' })
  }

  if (detalle.estadoDecision) {
    throw createError({ statusCode: 409, message: 'Este detalle ya fue decidido' })
  }

  const [opcion] = await db
    .select()
    .from(gastosFuturosOpciones)
    .where(
      and(eq(gastosFuturosOpciones.id, opcionId), eq(gastosFuturosOpciones.detalleId, detalleId)),
    )
    .limit(1)

  if (!opcion) {
    throw createError({ statusCode: 404, message: 'Opcion no encontrada' })
  }

  const concepto = `${proyecto.tipoGasto} - ${opcion.nombre}`.slice(0, 255)

  await db.transaction(async (tx) => {
    let gastoId = null
    let gastoPlanificadoId = null

    if (tipo === 'comprar') {
      const { fecha: fechaLocal, hora: horaLocal } = await getFechaHoraLocalUsuario(usuarioId)
      const fecha = body.fecha || fechaLocal

      const [creado] = await tx
        .insert(gastos)
        .values({
          usuarioId,
          categoriaId: proyecto.categoriaId,
          concepto,
          monto: String(monto),
          fecha,
          hora: horaLocal,
          metodoRegistro: 'manual',
          notas,
        })
        .returning({ id: gastos.id })
      gastoId = creado.id
    } else {
      // El schema garantiza la fecha para 'planificar'.
      const fechaProbable = body.fecha
      const [anio, mes] = fechaProbable.split('-').map(Number)

      // El mismo helper que usa el planificador: tolera el plan creado en
      // paralelo por otra petición en vez de reventar por el UNIQUE.
      const plan = await obtenerOCrearPlan(usuarioId, mes, anio, tx)

      const [creado] = await tx
        .insert(gastosPlanificados)
        .values({
          planMensualId: plan.id,
          categoriaId: proyecto.categoriaId,
          concepto,
          montoEstimado: String(monto),
          fechaProbablePago: fechaProbable,
          notas,
        })
        .returning({ id: gastosPlanificados.id })
      gastoPlanificadoId = creado.id
    }

    await tx
      .delete(gastosFuturosOpciones)
      .where(and(eq(gastosFuturosOpciones.detalleId, detalleId)))

    await tx.insert(gastosFuturosOpciones).values({
      detalleId,
      nombre: opcion.nombre,
      referenciaUrl: opcion.referenciaUrl,
      imagenUrl: opcion.imagenUrl,
      precioMinimo: opcion.precioMinimo,
      precioMaximo: opcion.precioMaximo,
      precioPromedio: opcion.precioPromedio,
      notas: opcion.notas,
      orden: 0,
    })

    await tx
      .update(gastosFuturosDetalles)
      .set({
        estadoDecision: tipo === 'comprar' ? 'comprada' : 'planificada',
        decididoEn: new Date(),
        gastoId,
        gastoPlanificadoId,
        updatedAt: new Date(),
      })
      .where(eq(gastosFuturosDetalles.id, detalleId))

    await tx
      .update(gastosFuturos)
      .set({ updatedAt: new Date() })
      .where(eq(gastosFuturos.id, proyectoId))
  })

  return await fetchFutureExpenseById(db, usuarioId, proyectoId)
})
