import { getUsuarioFromEvent } from '../../../utils/getUsuario.js'
import { validateBody } from '../../../utils/validate.js'
import { invitarMiembroSchema } from '~/shared/schemas/familia.js'
import { invitarMiembro } from '../../../services/espacios.service.js'

export default defineEventHandler(async (event) => {
  const espacioId = getRouterParam(event, 'id')
  const usuarioId = await getUsuarioFromEvent(event)
  const body = await validateBody(event, invitarMiembroSchema)
  try {
    return await invitarMiembro({
      espacioId,
      remitenteId: usuarioId,
      destinatarioEmail: body.destinatarioEmail,
      rol: body.rol,
      mensaje: body.mensaje,
    })
  } catch (e) {
    if (e?.statusCode) throw createError({ statusCode: e.statusCode, message: e.message })
    throw e
  }
})
