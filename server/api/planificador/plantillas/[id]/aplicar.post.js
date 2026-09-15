import { getUsuarioFromEvent } from '../../../../utils/getUsuario.js'
import { validateBody } from '../../../../utils/validate.js'
import { plantillaAplicarSchema } from '~/shared/schemas/planificador.js'
import { aplicarPlantilla } from '../../../../services/plantillasMes.service.js'
import { getUuidParam } from '../../../../utils/params.js'

export default defineEventHandler(async (event) => {
  const usuarioId = await getUsuarioFromEvent(event)
  const plantillaId = getUuidParam(event, 'id', { recurso: 'Plantilla' })
  const body = await validateBody(event, plantillaAplicarSchema)

  try {
    return await aplicarPlantilla({
      usuarioId,
      plantillaId,
      planMensualId: body.planMensualId,
    })
  } catch (e) {
    if (e?.statusCode) {
      throw createError({ statusCode: e.statusCode, message: e.message })
    }
    throw e
  }
})
