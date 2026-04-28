import { z } from 'zod'
import { getUsuarioFromEvent } from '../../../utils/getUsuario.js'
import { validateBody } from '../../../utils/validate.js'
import { mergePersonas } from '../../../services/deudas.service.js'

const bodySchema = z.object({
  destinoId: z.union([z.string(), z.number()]),
  origenIds: z.array(z.union([z.string(), z.number()])).min(1).max(20),
})

export default defineEventHandler(async (event) => {
  const usuarioId = await getUsuarioFromEvent(event)
  const body = await validateBody(event, bodySchema)

  try {
    return await mergePersonas({
      usuarioId,
      destinoId: String(body.destinoId),
      origenIds: body.origenIds.map(String),
    })
  } catch (e) {
    if (e?.statusCode) {
      throw createError({ statusCode: e.statusCode, message: e.message })
    }
    throw e
  }
})
