import { getUsuarioFromEvent } from '../../../utils/getUsuario.js'
import { crearGastoPlanificado } from '../../../services/planificador.service.js'
import { syncCreated } from '../../../utils/gcalAutoSync.js'
import { validateBody } from '../../../utils/validate.js'
import { gastoPlanificadoSchema } from '~/shared/schemas/planificador.js'

export default defineEventHandler(async (event) => {
  const usuarioId = await getUsuarioFromEvent(event)

  // `gastoPlanificadoSchema` existía sin usar y describiendo otra forma de
  // cuerpo (ver el schema). Corregido y cableado: sin él los nueve cuerpos
  // del fuzz llegaban al INSERT y devolvían un 500 con el SQL.
  const body = await validateBody(event, gastoPlanificadoSchema)

  try {
    const gasto = await crearGastoPlanificado({ usuarioId, body })
    syncCreated(usuarioId, gasto.id)
    return gasto
  } catch (e) {
    if (e?.statusCode) {
      throw createError({ statusCode: e.statusCode, message: e.message })
    }
    throw e
  }
})
