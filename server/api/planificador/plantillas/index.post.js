import { getUsuarioFromEvent } from '../../../utils/getUsuario.js'
import { validateBody } from '../../../utils/validate.js'
import { plantillaCreateSchema } from '~/shared/schemas/planificador.js'
import { crearPlantilla, crearPlantillaDesdePlan } from '../../../services/plantillasMes.service.js'

export default defineEventHandler(async (event) => {
  const usuarioId = await getUsuarioFromEvent(event)
  // Los ids son uuid: `desdePlanId: "abc"` reventaba el SELECT del plan con
  // el SQL dentro. El schema vive en shared/ con los demás del planificador.
  const body = await validateBody(event, plantillaCreateSchema)

  try {
    if ('desdePlanId' in body) {
      return await crearPlantillaDesdePlan({
        usuarioId,
        planMensualId: body.desdePlanId,
        nombre: body.nombre,
        notas: body.notas,
      })
    }
    return await crearPlantilla({ usuarioId, body })
  } catch (e) {
    if (e?.statusCode) {
      throw createError({ statusCode: e.statusCode, message: e.message })
    }
    throw e
  }
})
