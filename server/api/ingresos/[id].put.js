import { getUsuarioFromEvent } from '../../utils/getUsuario.js'
import { validateBody } from '../../utils/validate.js'
import { ingresoUpdateSchema } from '~/shared/schemas/ingresos.js'
import { actualizarIngreso } from '../../services/ingresos.service.js'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const usuarioId = await getUsuarioFromEvent(event)
  const body = await validateBody(event, ingresoUpdateSchema)
  try {
    return await actualizarIngreso({ id, usuarioId, body })
  } catch (e) {
    if (e?.statusCode) {
      throw createError({ statusCode: e.statusCode, message: e.message })
    }
    throw e
  }
})
