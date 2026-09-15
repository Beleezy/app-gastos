import { getUsuarioFromEvent } from '../../../utils/getUsuario.js'
import { validateBody } from '../../../utils/validate.js'
import { mergePersonasSchema } from '~/shared/schemas/deudas.js'
import { mergePersonas } from '../../../services/deudas.service.js'

export default defineEventHandler(async (event) => {
  const usuarioId = await getUsuarioFromEvent(event)
  // Los ids son uuid: `z.union([z.string(), z.number()])` dejaba pasar "abc",
  // que reventaba el `inArray` con un 500 y el SQL en el mensaje.
  const body = await validateBody(event, mergePersonasSchema)

  try {
    return await mergePersonas({
      usuarioId,
      destinoId: body.destinoId,
      origenIds: body.origenIds,
    })
  } catch (e) {
    if (e?.statusCode) {
      throw createError({ statusCode: e.statusCode, message: e.message })
    }
    throw e
  }
})
