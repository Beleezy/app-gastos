import { getUsuarioFromEvent } from '../../utils/getUsuario.js'
import { listarIngresos } from '../../services/ingresos.service.js'
import { validateQuery } from '../../utils/validate.js'
import { mesAnioQuerySchema } from '~/shared/schemas/common.js'

export default defineEventHandler(async (event) => {
  const usuarioId = await getUsuarioFromEvent(event)
  // `parseInt(x) || default` acota lo que no es número pero deja pasar un
  // `?mes=99&anio=1`, que arma un rango imposible y revienta la consulta.
  const q = validateQuery(event, mesAnioQuerySchema)
  return listarIngresos({
    usuarioId,
    mes: q.mes ? Number(q.mes) : undefined,
    anio: q.anio ? Number(q.anio) : undefined,
    fechaDesde: q.fechaDesde,
    fechaHasta: q.fechaHasta,
    origen: q.origen,
    limit: q.limit,
    offset: q.offset,
  })
})
