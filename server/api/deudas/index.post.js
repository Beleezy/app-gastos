import { getUsuarioFromEvent } from '../../utils/getUsuario.js'
import { validateBody } from '../../utils/validate.js'
import { deudaCreateSchema } from '../../../shared/schemas/deudas.js'
import { crearDeuda } from '../../services/deudas.service.js'

export default defineEventHandler(async (event) => {
  const usuarioId = await getUsuarioFromEvent(event)
  const body = await validateBody(event, deudaCreateSchema)

  try {
    return await crearDeuda({ usuarioId, body })
  } catch (e) {
    if (e?.statusCode) {
      throw createError({ statusCode: e.statusCode, message: e.message })
    }
    throw e
  }
})
