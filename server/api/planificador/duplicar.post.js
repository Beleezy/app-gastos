import { db } from '../../utils/db.js'
import { planesMensuales, gastosPlanificados, categorias } from '../../database/schema.js'
import { getUsuarioId } from '../../utils/getUsuario.js'
import { eq, and } from 'drizzle-orm'
import { obtenerOCrearPlan } from '../../utils/recurrente.js'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const usuarioId = await getUsuarioId()

  const { mesOrigen, anioOrigen, mesDestino, anioDestino } = body

  if (!mesOrigen || !anioOrigen || !mesDestino || !anioDestino) {
    throw createError({ statusCode: 400, message: 'Se requieren mes/año de origen y destino' })
  }

  // Obtener plan de origen
  const [planOrigen] = await db
    .select()
    .from(planesMensuales)
    .where(and(
      eq(planesMensuales.usuarioId, usuarioId),
      eq(planesMensuales.mes, Number(mesOrigen)),
      eq(planesMensuales.anio, Number(anioOrigen)),
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

  // Ejecutar en transacción para garantizar consistencia
  const result = await db.transaction(async (tx) => {
    // Crear o obtener plan de destino
    const planDestino = await obtenerOCrearPlan(usuarioId, Number(mesDestino), Number(anioDestino))

    // Actualizar presupuesto del destino con el del origen
    await tx
      .update(planesMensuales)
      .set({ montoPresupuesto: planOrigen.montoPresupuesto, updatedAt: new Date() })
      .where(eq(planesMensuales.id, planDestino.id))

    // Calcular días del mes destino para ajustar fechas
    const diasDestino = new Date(Number(anioDestino), Number(mesDestino), 0).getDate()

    // Copiar gastos (sin recurrencia, estado pendiente)
    const nuevosGastos = gastosOrigen.map(g => {
      const diaOriginal = parseInt(g.fechaProbablePago.split('-')[2])
      const diaAjustado = Math.min(diaOriginal, diasDestino)
      const fechaNueva = `${anioDestino}-${String(mesDestino).padStart(2, '0')}-${String(diaAjustado).padStart(2, '0')}`

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
})
