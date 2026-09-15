import { getUsuarioFromEvent } from '../../../utils/getUsuario.js'
import { validateBody } from '../../../utils/validate.js'
import { pagoUpdateSchema } from '~/shared/schemas/deudas.js'
import { actualizarPago } from '../../../services/pagos.service.js'
import { getUuidParam } from '../../../utils/params.js'

export default defineEventHandler(async (event) => {
  const pagoId = getUuidParam(event, 'pagoId', { recurso: 'Pago' })
  const usuarioId = await getUsuarioFromEvent(event)
  // Leía `readBody` crudo: sin cuerpo era un TypeError y `fechaPago: "el
  // martes"` un 500 con el SQL dentro. La lógica —con la deuda bloqueada,
  // ver pagos.service.js— vive en el servicio.
  const body = await validateBody(event, pagoUpdateSchema)

  try {
    return await actualizarPago({ usuarioId, pagoId, body })
  } catch (e) {
    if (e?.statusCode) {
      throw createError({ statusCode: e.statusCode, message: e.message })
    }
    throw e
  }
})
