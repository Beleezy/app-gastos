import { getUsuarioFromEvent } from '../../utils/getUsuario.js'
import { validateBody } from '../../utils/validate.js'
import { ingresoCreateSchema } from '~/shared/schemas/ingresos.js'
import { crearIngreso } from '../../services/ingresos.service.js'

export default defineEventHandler(async (event) => {
  const usuarioId = await getUsuarioFromEvent(event)
  const body = await validateBody(event, ingresoCreateSchema)
  try {
    return await crearIngreso({ usuarioId, body })
  } catch (e) {
    if (e?.statusCode) {
      throw createError({ statusCode: e.statusCode, message: e.message })
    }
    throw e
  }
})
