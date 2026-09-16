// Endpoint cron: refresca el catálogo de modelos de IA desde la API de
// Google (tabla modelos_llm, migración 0036). Mismo esquema de auth que el
// resto de crons (X-Cron-Secret); lo dispara mantenimiento.yml.
//
// Sin GEMINI_API_KEY no hay nada que consultar: responde 200 con
// `omitido: true` en vez de fallar, porque el resto del mantenimiento no
// depende de la IA y un rojo aquí taparía un fallo real de otra tarea.
import { descubrirModelos } from '../../utils/modelosLlm.js'
import { logger } from '../../utils/logger.js'

export default defineEventHandler(async (event) => {
  const secret = process.env.CRON_SECRET
  const got = getRequestHeader(event, 'x-cron-secret')
  if (!secret || !got || secret !== got) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }
  const apiKey = useRuntimeConfig().geminiApiKey
  if (!apiKey) return { omitido: true, motivo: 'Sin GEMINI_API_KEY' }
  try {
    const resumen = await descubrirModelos({ apiKey })
    return { omitido: false, ...resumen }
  } catch (e) {
    logger.error('Descubrimiento de modelos falló', { error: e })
    throw createError({ statusCode: 502, message: 'No se pudo consultar la lista de modelos' })
  }
})
