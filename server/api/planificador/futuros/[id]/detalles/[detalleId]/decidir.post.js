import { and, eq } from 'drizzle-orm'
import { db } from '../../../../../../utils/db.js'
import {
  gastosFuturos,
  gastosFuturosDetalles,
  gastosFuturosOpciones,
  gastos,
  gastosPlanificados,
  planesMensuales,
  configuraciones,
} from '../../../../../../database/schema.js'
import { getUsuarioFromEvent } from '../../../../../../utils/getUsuario.js'
import { getFechaHoraLocalUsuario } from '../../../../../../utils/fechaLocal.js'
import { fetchFutureExpenseById } from '../../../../../../utils/gastosFuturos.js'

function parseAmount(value) {
  if (value === null || value === undefined || value === '') return null
  const n = Number(value)
  if (!Number.isFinite(n) || n <= 0) return null
  return Math.round((n + Number.EPSILON) * 100) / 100
}

async function obtenerOCrearPlan(tx, usuarioId, mes, anio) {
  const [existing] = await tx
    .select()
    .from(planesMensuales)
    .where(
      and(
        eq(planesMensuales.usuarioId, usuarioId),
        eq(planesMensuales.mes, mes),
        eq(planesMensuales.anio, anio),
      ),
    )
    .limit(1)

  if (existing) return existing

  const [config] = await tx
    .select({ presupuestoMensualDefault: configuraciones.presupuestoMensualDefault })
    .from(configuraciones)
    .where(eq(configuraciones.usuarioId, usuarioId))
    .limit(1)

  const presupuesto = config?.presupuestoMensualDefault || '0'

  const [nuevo] = await tx
    .insert(planesMensuales)
    .values({ usuarioId, mes, anio, montoPresupuesto: presupuesto })
    .returning()

  return nuevo
}

export default defineEventHandler(async (event) => {
  const proyectoId = getRouterParam(event, 'id')
  const detalleId = getRouterParam(event, 'detalleId')
  const body = await readBody(event)
  const usuarioId = await getUsuarioFromEvent(event)

  const tipo = body?.tipo
  if (!['planificar', 'comprar'].includes(tipo)) {
    throw createError({ statusCode: 400, message: 'Tipo de decision invalido' })
  }

  const opcionId = body?.opcionId
  if (!opcionId) {
    throw createError({ statusCode: 400, message: 'Debes elegir una opcion' })
  }

  const monto = parseAmount(body?.monto)
  if (monto === null) {
    throw createError({ statusCode: 400, message: 'El monto debe ser mayor a 0' })
  }

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
      const fecha = body?.fecha || fechaLocal
      const hora = horaLocal

      const [creado] = await tx
        .insert(gastos)
        .values({
          usuarioId,
          categoriaId: proyecto.categoriaId,
          concepto,
          monto: String(monto),
          fecha,
          hora,
          metodoRegistro: 'manual',
          notas: body?.notas || null,
        })
        .returning({ id: gastos.id })
      gastoId = creado.id
    } else {
      const fechaProbable = body?.fecha
      if (!fechaProbable) {
        throw createError({ statusCode: 400, message: 'La fecha probable es obligatoria' })
      }
      const [anioStr, mesStr] = fechaProbable.split('-')
      const mes = parseInt(mesStr, 10)
      const anio = parseInt(anioStr, 10)
      if (!mes || !anio) {
        throw createError({ statusCode: 400, message: 'Fecha invalida' })
      }

      const plan = await obtenerOCrearPlan(tx, usuarioId, mes, anio)

      const [creado] = await tx
        .insert(gastosPlanificados)
        .values({
          planMensualId: plan.id,
          categoriaId: proyecto.categoriaId,
          concepto,
          montoEstimado: String(monto),
          fechaProbablePago: fechaProbable,
          notas: body?.notas || null,
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
