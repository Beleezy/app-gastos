import { getUsuarioFromEvent } from '../../utils/getUsuario.js'
import { listarIngresos } from '../../services/ingresos.service.js'

export default defineEventHandler(async (event) => {
  const usuarioId = await getUsuarioFromEvent(event)
  const q = getQuery(event)
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
