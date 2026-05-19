import { getUsuarioFromEvent } from '../../utils/getUsuario.js'
import { validateBody } from '../../utils/validate.js'
import { transferenciaCreateSchema } from '~/shared/schemas/cuentas.js'
import { crearTransferencia } from '../../services/cuentas.service.js'

export default defineEventHandler(async (event) => {
  const usuarioId = await getUsuarioFromEvent(event)
  const body = await validateBody(event, transferenciaCreateSchema)
  try {
    return await crearTransferencia({ usuarioId, body })
  } catch (e) {
    if (e?.statusCode) throw createError({ statusCode: e.statusCode, message: e.message })
    throw e
  }
})
