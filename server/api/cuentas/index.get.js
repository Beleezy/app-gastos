import { getUsuarioFromEvent } from '../../utils/getUsuario.js'
import { listarCuentas } from '../../services/cuentas.service.js'

export default defineEventHandler(async (event) => {
  const usuarioId = await getUsuarioFromEvent(event)
  const q = getQuery(event)
  return listarCuentas({ usuarioId, incluirSaldos: q.saldos !== 'false' })
})
