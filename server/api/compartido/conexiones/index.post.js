import { getUsuarioFromEvent } from '../../../utils/getUsuario.js'
import { validateBody } from '../../../utils/validate.js'
import { rateLimits } from '../../../utils/rateLimit.js'
import { invitacionCompartidoSchema } from '~/shared/schemas/compartido.js'
import { crearInvitacion } from '../../../services/compartido.service.js'

export default defineEventHandler(async (event) => {
  const usuarioId = await getUsuarioFromEvent(event)
  await rateLimits.compartidoInvitar(event, usuarioId)
  const body = await validateBody(event, invitacionCompartidoSchema)
  setResponseStatus(event, 201)
  return crearInvitacion({ usuarioId, body })
})
