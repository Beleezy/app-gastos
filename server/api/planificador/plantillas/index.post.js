import { z } from 'zod'
import { getUsuarioFromEvent } from '../../../utils/getUsuario.js'
import { validateBody } from '../../../utils/validate.js'
import { crearPlantilla, crearPlantillaDesdePlan } from '../../../services/plantillasMes.service.js'

const itemSchema = z.object({
  concepto: z.string().trim().min(1).max(200),
  montoEstimado: z.number().finite().positive().max(10_000_000),
  categoriaId: z.union([z.string(), z.number()]),
  diaProbable: z.number().int().min(1).max(31).optional().nullable(),
  notas: z.string().trim().max(1000).optional().nullable(),
})

const bodySchema = z.union([
  z.object({
    nombre: z.string().trim().min(1).max(150),
    desdePlanId: z.union([z.string(), z.number()]),
    notas: z.string().trim().max(1000).optional().nullable(),
  }),
  z.object({
    nombre: z.string().trim().min(1).max(150),
    montoPresupuesto: z.number().finite().nonnegative().optional().nullable(),
    gastos: z.array(itemSchema).max(200),
    notas: z.string().trim().max(1000).optional().nullable(),
  }),
])

export default defineEventHandler(async (event) => {
  const usuarioId = await getUsuarioFromEvent(event)
  const body = await validateBody(event, bodySchema)

  try {
    if ('desdePlanId' in body) {
      return await crearPlantillaDesdePlan({
        usuarioId,
        planMensualId: String(body.desdePlanId),
        nombre: body.nombre,
        notas: body.notas,
      })
    }
    return await crearPlantilla({ usuarioId, body })
  } catch (e) {
    if (e?.statusCode) {
      throw createError({ statusCode: e.statusCode, message: e.message })
    }
    throw e
  }
})
