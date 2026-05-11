import { db } from '../../utils/db.js'
import { getUsuarioFromEvent } from '../../utils/getUsuario.js'
import { fetchFuturePortfolio } from '../../utils/gastosFuturos.js'

export default defineEventHandler(async (event) => {
  const usuarioId = await getUsuarioFromEvent(event)
  const { gastosFuturos, resumenFuturos } = await fetchFuturePortfolio(db, usuarioId)
  return { gastosFuturos, resumenFuturos }
})
