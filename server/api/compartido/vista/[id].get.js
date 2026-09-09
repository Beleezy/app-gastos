import { getUsuarioFromEvent } from '../../../utils/getUsuario.js'
import { validateQuery } from '../../../utils/validate.js'
import { vistaCompartidaQuerySchema } from '~/shared/schemas/compartido.js'
import { vistaCompartida } from '../../../services/compartidoVista.service.js'
import { getUuidParam } from '../../../utils/params.js'

export default defineEventHandler(async (event) => {
  const conexionId = getUuidParam(event, 'id', { recurso: 'Conexión' })
  const usuarioId = await getUsuarioFromEvent(event)
  const { mes, anio, fresh } = validateQuery(event, vistaCompartidaQuerySchema)

  // El botón "Sincronizar" manda ?fresh=1: sin esto el usuario aprieta y el
  // navegador le devuelve la misma respuesta cacheada, que es peor que no
  // tener botón. Son datos de otra persona: siempre `private`.
  setHeader(
    event,
    'Cache-Control',
    fresh ? 'private, no-store' : 'private, max-age=30, stale-while-revalidate=180',
  )

  return vistaCompartida({ conexionId, usuarioId, mes, anio })
})
