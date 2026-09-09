import { getUsuarioFromEvent } from '../../../../utils/getUsuario.js'
import { validateBody } from '../../../../utils/validate.js'
import { alcanceCompartidoSchema } from '~/shared/schemas/compartido.js'
import { actualizarAlcance } from '../../../../services/compartido.service.js'
import { getUuidParam } from '../../../../utils/params.js'

export default defineEventHandler(async (event) => {
  const conexionId = getUuidParam(event, 'id', { recurso: 'Conexión' })
  const usuarioId = await getUsuarioFromEvent(event)
  const body = await validateBody(event, alcanceCompartidoSchema)
  return actualizarAlcance({ conexionId, usuarioId, body })
})
