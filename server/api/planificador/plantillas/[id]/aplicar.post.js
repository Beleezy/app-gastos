import { z } from 'zod'
import { getUsuarioFromEvent } from '../../../../utils/getUsuario.js'
import { validateBody } from '../../../../utils/validate.js'
import { aplicarPlantilla } from '../../../../services/plantillasMes.service.js'

const bodySchema = z.object({
  planMensualId: z.union([z.string(), z.number()]),
})

export default defineEventHandler(async (event) => {
  const usuarioId = await getUsuarioFromEvent(event)
  const plantillaId = getRouterParam(event, 'id')
  const body = await validateBody(event, bodySchema)

  try {
    return await aplicarPlantilla({
      usuarioId,
      plantillaId,
      planMensualId: String(body.planMensualId),
    })
  } catch (e) {
    if (e?.statusCode) {
      throw createError({ statusCode: e.statusCode, message: e.message })
    }
    throw e
  }
})
