import { getUsuarioFromEvent } from '../../../utils/getUsuario.js'
import { revertirPago } from '../../../services/pagos.service.js'
import { getUuidParam } from '../../../utils/params.js'

export default defineEventHandler(async (event) => {
  const pagoId = getUuidParam(event, 'pagoId', { recurso: 'Pago' })
  const usuarioId = await getUsuarioFromEvent(event)

  try {
    return await revertirPago({ usuarioId, pagoId })
  } catch (e) {
    if (e?.statusCode) {
      throw createError({ statusCode: e.statusCode, message: e.message })
    }
    throw e
  }
})
