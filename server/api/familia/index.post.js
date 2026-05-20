import { getUsuarioFromEvent } from '../../utils/getUsuario.js'
import { validateBody } from '../../utils/validate.js'
import { espacioCreateSchema } from '~/shared/schemas/familia.js'
import { crearEspacio } from '../../services/espacios.service.js'

export default defineEventHandler(async (event) => {
  const usuarioId = await getUsuarioFromEvent(event)
  const body = await validateBody(event, espacioCreateSchema)
  return crearEspacio({ usuarioId, body })
})
