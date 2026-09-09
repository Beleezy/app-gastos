import { getUsuarioFromEvent } from '../../../utils/getUsuario.js'
import { validateBody } from '../../../utils/validate.js'
import { conIdempotencia } from '../../../utils/idempotency.js'
import { avisoCreateSchema } from '~/shared/schemas/compartido.js'
import { crearAviso } from '../../../services/compartido.service.js'

export default defineEventHandler(async (event) => {
  const usuarioId = await getUsuarioFromEvent(event)

  // El feed es corto y muy visible: un doble tap en móvil, o un reintento de
  // la cola offline, no debe dejar el mismo aviso dos veces.
  const aviso = await conIdempotencia(event, usuarioId, async () => {
    const body = await validateBody(event, avisoCreateSchema)
    return crearAviso({ usuarioId, body })
  })

  setResponseStatus(event, 201)
  return aviso
})
