/**
 * Gestión inteligente de modelos Gemini:
 * - Soporte para múltiples modelos separados por ";"
 * - Validación contra la API de modelos disponibles
 * - Rate tracking por minuto para evitar saturación (ej: 5 req/min)
 */

// Conteo de peticiones por modelo por minuto: Map<modelo, Map<minutoKey, count>>
const requestCounts = new Map()

// Cache de modelos validados (se refresca cada 10 minutos)
let validatedModelsCache = null
let validatedModelsCacheTime = 0
const CACHE_TTL = 10 * 60 * 1000 // 10 minutos

/**
 * Parsea la cadena de modelos separados por ";" y devuelve un array limpio
 */
export function parseModelList(modelString) {
  if (!modelString) return []
  return modelString
    .split(';')
    .map(m => m.trim())
    .filter(m => m.length > 0)
}

/**
 * Consulta la API de Gemini para obtener los modelos disponibles para la API key
 */
async function fetchAvailableModels(apiKey) {
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
    )
    if (!response.ok) {
      console.error('Error al consultar modelos disponibles:', response.status)
      return null
    }
    const data = await response.json()
    // Los modelos vienen como "models/gemini-2.5-flash", extraemos solo el nombre
    return (data.models || []).map(m => m.name.replace('models/', ''))
  } catch (e) {
    console.error('Error al consultar modelos disponibles:', e.message)
    return null
  }
}

/**
 * Valida qué modelos del listado del usuario están disponibles para su API key.
 * Usa cache de 10 minutos para no saturar la API de listado.
 */
export async function getValidModels(configuredModels, apiKey) {
  const now = Date.now()

  // Usar cache si es reciente
  if (validatedModelsCache && (now - validatedModelsCacheTime) < CACHE_TTL) {
    const valid = configuredModels.filter(m => validatedModelsCache.includes(m))
    if (valid.length > 0) return valid
  }

  // Consultar API
  const available = await fetchAvailableModels(apiKey)
  if (!available) {
    // Si falla la consulta, usar todos los configurados sin filtrar
    console.warn('No se pudo validar modelos, usando todos los configurados')
    return configuredModels
  }

  // Actualizar cache
  validatedModelsCache = available
  validatedModelsCacheTime = now

  const valid = configuredModels.filter(m => available.includes(m))

  if (valid.length === 0) {
    console.warn(
      `Ninguno de los modelos configurados está disponible. Configurados: [${configuredModels.join(', ')}]. Disponibles: [${available.slice(0, 10).join(', ')}...]`
    )
    // Devolver los configurados como fallback (la API dará error más descriptivo)
    return configuredModels
  }

  const invalid = configuredModels.filter(m => !available.includes(m))
  if (invalid.length > 0) {
    console.warn(`Modelos no disponibles (ignorados): [${invalid.join(', ')}]`)
  }

  return valid
}

/**
 * Registra una petición al modelo en el minuto actual
 */
export function trackRequest(model) {
  const minuteKey = Math.floor(Date.now() / 60000)

  if (!requestCounts.has(model)) {
    requestCounts.set(model, new Map())
  }

  const modelCounts = requestCounts.get(model)

  // Limpiar minutos antiguos (mantener solo el actual y el anterior)
  for (const [key] of modelCounts) {
    if (key < minuteKey - 1) {
      modelCounts.delete(key)
    }
  }

  const current = modelCounts.get(minuteKey) || 0
  modelCounts.set(minuteKey, current + 1)
}

/**
 * Obtiene el conteo de peticiones del modelo en el minuto actual
 */
export function getRequestCount(model) {
  const minuteKey = Math.floor(Date.now() / 60000)
  const modelCounts = requestCounts.get(model)
  if (!modelCounts) return 0
  return modelCounts.get(minuteKey) || 0
}

/**
 * Selecciona el mejor modelo basado en el menor uso en el minuto actual.
 * Si hay empate, respeta el orden original de configuración.
 */
export function selectBestModel(models) {
  if (models.length === 0) return null
  if (models.length === 1) return models[0]

  let bestModel = models[0]
  let bestCount = getRequestCount(models[0])

  for (let i = 1; i < models.length; i++) {
    const count = getRequestCount(models[i])
    if (count < bestCount) {
      bestCount = count
      bestModel = models[i]
    }
  }

  return bestModel
}

/**
 * Obtiene los modelos restantes para fallback (excluyendo el seleccionado),
 * ordenados por menor uso en el minuto actual.
 */
export function getFallbackModels(models, selectedModel) {
  return models
    .filter(m => m !== selectedModel)
    .sort((a, b) => getRequestCount(a) - getRequestCount(b))
}
