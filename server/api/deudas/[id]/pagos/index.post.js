import { z } from 'zod'
import { getUsuarioFromEvent } from '../../../../utils/getUsuario.js'
import { validateBody } from '../../../../utils/validate.js'
import { registrarPago } from '../../../../services/pagos.service.js'
import { fechaIso, monto, notasSchema } from '~/shared/schemas/common.js'

const pagoEndpointSchema = z.object({
  monto,
  fecha: fechaIso.optional(),
  fechaPago: fechaIso.optional(),
  metodoPago: z.string().trim().max(100).optional().nullable(),
  notas: notasSchema,
})

export default defineEventHandler(async (event) => {
  const deudaId = getRouterParam(event, 'id')
  const usuarioId = await getUsuarioFromEvent(event)
  const body = await validateBody(event, pagoEndpointSchema)

  try {
    return await registrarPago({ usuarioId, deudaId, body })
  } catch (e) {
    if (e?.statusCode) {
      throw createError({ statusCode: e.statusCode, message: e.message })
    }
    throw e
  }
})
