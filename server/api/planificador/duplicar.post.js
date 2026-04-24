import { db } from '../../utils/db.js'
import { planesMensuales, gastosPlanificados } from '../../database/schema.js'
import { getUsuarioFromEvent } from '../../utils/getUsuario.js'
import { eq, and } from 'drizzle-orm'
import { obtenerOCrearPlan } from '../../utils/recurrente.js'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const usuarioId = await getUsuarioFromEvent(event)

  const { mesOrigen, anioOrigen, mesDestino, anioDestino } = body

  if (!mesOrigen || !anioOrigen || !mesDestino || !anioDestino) {
    throw createError({ statusCode: 400, message: 'Se requieren mes/año de origen y destino' })
  }

  const mesO = Number(mesOrigen)
  const anioO = Number(anioOrigen)
  const mesD = Number(mesDestino)
  const anioD = Number(anioDestino)

  // Obtener plan de origen
  const [planOrigen] = await db
    .select()
    .from(planesMensuales)
    .where(and(
      eq(planesMensuales.usuarioId, usuarioId),
      eq(planesMensuales.mes, mesO),
      eq(planesMensuales.anio, anioO),
    ))
    .limit(1)

  if (!planOrigen) {
    throw createError({ statusCode: 404, message: 'No se encontró el plan del mes origen' })
  }

  // Obtener gastos del plan de origen
  const gastosOrigen = await db
    .select()
    .from(gastosPlanificados)
    .where(eq(gastosPlanificados.planMensualId, planOrigen.id))

  if (gastosOrigen.length === 0) {
    throw createError({ statusCode: 400, message: 'El mes origen no tiene gastos planificados' })
  }

  try {
    const result = await db.transaction(async (tx) => {
      // Crear o obtener plan de destino (dentro de la transacción)
      const planDestino = await obtenerOCrearPlan(usuarioId, mesD, anioD, tx)

      if (!planDestino?.id) {
        throw createError({ statusCode: 500, message: 'No se pudo crear el plan del mes destino' })
      }

      // Actualizar presupuesto del destino con el del origen
      await tx
        .update(planesMensuales)
        .set({ montoPresupuesto: planOrigen.montoPresupuesto, updatedAt: new Date() })
        .where(eq(planesMensuales.id, planDestino.id))

      // Días del mes destino para ajustar fechas de gastos recurrentes mensuales
      const diasDestino = new Date(anioD, mesD, 0).getDate()
      const mesDStr = String(mesD).padStart(2, '0')

      // Copiar gastos: todos quedan en estado 'pendiente', sin recurrencia,
      // y con fecha ajustada al mes destino (o null si el origen no tenía fecha).
      const nuevosGastos = gastosOrigen.map((g) => {
        let fechaNueva = null
        if (g.fechaProbablePago) {
          const partes = String(g.fechaProbablePago).split('-')
          const diaOriginal = parseInt(partes[2], 10)
          if (Number.isFinite(diaOriginal)) {
            const diaAjustado = Math.min(diaOriginal, diasDestino)
            fechaNueva = `${anioD}-${mesDStr}-${String(diaAjustado).padStart(2, '0')}`
          }
        }

        return {
          planMensualId: planDestino.id,
          categoriaId: g.categoriaId,
          concepto: g.concepto,
          montoEstimado: g.montoEstimado,
          fechaProbablePago: fechaNueva,
          esRecurrente: false,
          estado: 'pendiente',
          notas: g.notas,
        }
      })

      await tx.insert(gastosPlanificados).values(nuevosGastos)

      return {
        mensaje: `${nuevosGastos.length} gastos copiados exitosamente`,
        gastosCopied: nuevosGastos.length,
      }
    })

    return result
  } catch (e) {
    if (e?.statusCode) throw e
    throw createError({
      statusCode: 500,
      message: e?.message || 'Error al copiar el mes',
    })
  }
})
