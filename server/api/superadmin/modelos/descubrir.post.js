// Consulta la lista de modelos de Google y actualiza el catálogo: da de alta
// los nuevos (encendidos si son de la familia flash), retira los que ya no
// aparecen y reactiva los que el sistema apagó por fallos hace más de una
// semana. Mismo trabajo que el cron semanal, a demanda.
import { requireSuperadmin } from '../../../utils/getUsuario.js'
import { descubrirModelos } from '../../../utils/modelosLlm.js'

export default defineEventHandler(async (event) => {
  await requireSuperadmin(event)
  const apiKey = useRuntimeConfig().geminiApiKey
  if (!apiKey) {
    throw createError({
      statusCode: 503,
      message: 'Sin GEMINI_API_KEY configurada: no se puede consultar a Google',
    })
  }
  try {
    return await descubrirModelos({ apiKey })
  } catch (e) {
    throw createError({
      statusCode: e?.statusCode || 502,
      message: e?.statusCode ? e.message : 'No se pudo consultar la lista de modelos',
    })
  }
})
