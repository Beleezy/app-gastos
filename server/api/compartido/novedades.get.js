// Alimenta el badge de navegación y el banner de recordatorios: avisos sin
// leer, categorías que pasaron el umbral del observador y gastos nuevos
// desde la última revisión.

import { getUsuarioFromEvent } from '../../utils/getUsuario.js'
import { novedades } from '../../services/compartidoVista.service.js'

export default defineEventHandler(async (event) => {
  const usuarioId = await getUsuarioFromEvent(event)
  setHeader(event, 'Cache-Control', 'private, max-age=60, stale-while-revalidate=300')
  return novedades({ usuarioId })
})
