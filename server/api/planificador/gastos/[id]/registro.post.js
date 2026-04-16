import { db } from '../../../../utils/db.js'
import { gastosPlanificados, planesMensuales, gastos, categorias, ahorros } from '../../../../database/schema.js'
import { getUsuarioFromEvent } from '../../../../utils/getUsuario.js'
import { getFechaHoraLocalUsuario } from '../../../../utils/fechaLocal.js'
import { eq, and } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const body = await readBody(event)
  const usuarioId = await getUsuarioFromEvent(event)

  if (!body.fechaPago) {
    throw createError({ statusCode: 400, message: 'La fecha de pago es obligatoria' })
  }

  const [gastoPlanificado] = await db
    .select({
      id: gastosPlanificados.id,
      categoriaId: gastosPlanificados.categoriaId,
      concepto: gastosPlanificados.concepto,
      montoEstimado: gastosPlanificados.montoEstimado,
    })
    .from(gastosPlanificados)
    .innerJoin(planesMensuales, eq(gastosPlanificados.planMensualId, planesMensuales.id))
    .where(and(
      eq(gastosPlanificados.id, id),
      eq(planesMensuales.usuarioId, usuarioId),
    ))
    .limit(1)

  if (!gastoPlanificado) {
    throw createError({ statusCode: 404, message: 'Gasto planificado no encontrado' })
  }

  const [gastoExistente] = await db
    .select({
      id: gastos.id,
      hora: gastos.hora,
    })
    .from(gastos)
    .where(and(
      eq(gastos.gastoPlanificadoId, id),
      eq(gastos.usuarioId, usuarioId),
    ))
    .limit(1)

  const { hora: horaLocal } = await getFechaHoraLocalUsuario(usuarioId)
  const horaRegistro = gastoExistente?.hora || horaLocal

  const [gastoGuardado] = await db.transaction(async (tx) => {
    let gastoActualizado

    if (gastoExistente) {
      ;[gastoActualizado] = await tx
        .update(gastos)
        .set({
          categoriaId: gastoPlanificado.categoriaId,
          concepto: gastoPlanificado.concepto,
          monto: String(gastoPlanificado.montoEstimado),
          fecha: body.fechaPago,
          hora: horaRegistro,
          notas: body.notas?.trim() || null,
          updatedAt: new Date(),
        })
        .where(and(
          eq(gastos.id, gastoExistente.id),
          eq(gastos.usuarioId, usuarioId),
        ))
        .returning()
    } else {
      ;[gastoActualizado] = await tx
        .insert(gastos)
        .values({
          usuarioId,
          categoriaId: gastoPlanificado.categoriaId,
          gastoPlanificadoId: gastoPlanificado.id,
          concepto: gastoPlanificado.concepto,
          monto: String(gastoPlanificado.montoEstimado),
          fecha: body.fechaPago,
          hora: horaRegistro,
          metodoRegistro: 'manual',
          notas: body.notas?.trim() || null,
        })
        .returning()
    }

    await tx
      .update(gastosPlanificados)
      .set({
        estado: 'pagado',
        updatedAt: new Date(),
      })
      .where(eq(gastosPlanificados.id, gastoPlanificado.id))

    return [gastoActualizado]
  })

  const [categoria] = await db
    .select()
    .from(categorias)
    .where(eq(categorias.id, gastoGuardado.categoriaId))
    .limit(1)

  if (categoria?.nombre?.toLowerCase() === 'ahorro') {
    const fechaObj = new Date(gastoGuardado.fecha + 'T00:00:00')
    try {
      await db.insert(ahorros).values({
        usuarioId,
        medioAhorroId: body.medioAhorroId || null,
        gastoPlanificadoId: gastoPlanificado.id,
        gastoId: gastoGuardado.id,
        concepto: gastoGuardado.concepto,
        monto: String(gastoGuardado.monto),
        fecha: gastoGuardado.fecha,
        mes: fechaObj.getMonth() + 1,
        anio: fechaObj.getFullYear(),
      })
    } catch (_) {
      // No bloquear si falla la creación del ahorro vinculado
    }
  }

  return {
    gasto: {
      ...gastoGuardado,
      monto: parseFloat(gastoGuardado.monto),
      categoriaNombre: categoria?.nombre,
      categoriaIcono: categoria?.icono,
      categoriaColor: categoria?.color,
    },
    planificado: {
      id: gastoPlanificado.id,
      estado: 'pagado',
      gastoRegistradoId: gastoGuardado.id,
      gastoRegistradoFecha: gastoGuardado.fecha,
      gastoRegistradoHora: gastoGuardado.hora,
      gastoRegistradoNotas: gastoGuardado.notas,
    },
  }
})
