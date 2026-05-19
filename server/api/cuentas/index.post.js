import { getUsuarioFromEvent } from '../../utils/getUsuario.js'
import { validateBody } from '../../utils/validate.js'
import { cuentaCreateSchema } from '~/shared/schemas/cuentas.js'
import { crearCuenta } from '../../services/cuentas.service.js'

export default defineEventHandler(async (event) => {
  const usuarioId = await getUsuarioFromEvent(event)
  const body = await validateBody(event, cuentaCreateSchema)
  return crearCuenta({ usuarioId, body })
})
