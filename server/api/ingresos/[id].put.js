import { getUsuarioFromEvent } from '../../utils/getUsuario.js'
import { validateBody } from '../../utils/validate.js'
import { ingresoUpdateSchema } from '~/shared/schemas/ingresos.js'
import { actualizarIngreso } from '../../services/ingresos.service.js'
import { getUuidParam } from '../../utils/params.js'

export default defineEventHandler(async (event) => {
  const id = getUuidParam(event, 'id', { recurso: 'Ingreso' })
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
