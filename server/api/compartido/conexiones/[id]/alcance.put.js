import { getUsuarioFromEvent } from '../../../../utils/getUsuario.js'
import { validateBody } from '../../../../utils/validate.js'
import { alcanceCompartidoSchema } from '~/shared/schemas/compartido.js'
import { actualizarAlcance } from '../../../../services/compartido.service.js'

export default defineEventHandler(async (event) => {
  const conexionId = getRouterParam(event, 'id')
  const usuarioId = await getUsuarioFromEvent(event)
  const body = await validateBody(event, alcanceCompartidoSchema)
  return actualizarAlcance({ conexionId, usuarioId, body })
})
