import { getUsuarioFromEvent } from '../../utils/getUsuario.js'
import { validateBody } from '../../utils/validate.js'
import { cuentaUpdateSchema } from '~/shared/schemas/cuentas.js'
import { actualizarCuenta } from '../../services/cuentas.service.js'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const usuarioId = await getUsuarioFromEvent(event)
  const body = await validateBody(event, cuentaUpdateSchema)
  try {
    return await actualizarCuenta({ id, usuarioId, body })
  } catch (e) {
    if (e?.statusCode) throw createError({ statusCode: e.statusCode, message: e.message })
    throw e
  }
})
