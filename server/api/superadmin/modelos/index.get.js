// Catálogo de modelos de IA. Solo superadmin.
import { requireSuperadmin } from '../../../utils/getUsuario.js'
import { listarModelos, maxFallosConsecutivos } from '../../../utils/modelosLlm.js'

export default defineEventHandler(async (event) => {
  await requireSuperadmin(event)
  const modelos = await listarModelos()
  return {
    modelos,
    maxFallos: maxFallosConsecutivos(),
    descubrimientoDisponible: !!useRuntimeConfig().geminiApiKey,
  }
})
