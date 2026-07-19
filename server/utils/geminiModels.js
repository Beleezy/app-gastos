/**
 * Gestión inteligente de modelos Gemini:
 * - Soporte para múltiples modelos separados por ";"
 * - Validación contra la API de modelos disponibles
 * - Rate tracking por minuto y por día con límites configurables
 * - Selección automática del modelo con capacidad disponible
 * - Mensaje de espera cuando todos los modelos están al límite
 *
 * Variables de entorno:
 *   GEMINI_RATE_LIMITS — límites por modelo, separados por ";".
 *     Formato: "modelo:rpm:rpd" (ej: "gemini-2.5-flash:10:250;gemini-3.1-flash-lite-preview:15:1000")
 *     Si no se configura, usa defaults conservadores (10 RPM, 250 RPD).
 */

// Conteo de peticiones por modelo por minuto: Map<modelo, Map<minuteKey, count>>
const requestCountsPerMinute = new Map()

// Conteo de peticiones por modelo por día: Map<modelo, Map<dayKey, count>>
const requestCountsPerDay = new Map()

// Cache de modelos validados (se refresca cada 10 minutos)
let validatedModelsCache = null
let validatedModelsCacheTime = 0
const CACHE_TTL = 10 * 60 * 1000

// Límites por modelo parseados: Map<modelo, { rpm, rpd }>
let parsedRateLimits = null

// Defaults conservadores para free tier
const DEFAULT_RPM = 10
const DEFAULT_RPD = 250

/**
 * Parsea la cadena de rate limits desde la variable de entorno.
 * Formato: "modelo:rpm:rpd;modelo2:rpm:rpd"
 * Ejemplo: "gemini-2.5-flash:10:250;gemini-3.1-flash-lite-preview:15:1000"
 */
function parseRateLimitsConfig(configString) {
  const limits = new Map()
  if (!configString) return limits

  configString.split(';').forEach((entry) => {
    const parts = entry.trim().split(':')
    if (parts.length >= 3) {
      const model = parts[0].trim()
      const rpm = parseInt(parts[1], 10)
      const rpd = parseInt(parts[2], 10)
      if (model && !isNaN(rpm) && !isNaN(rpd)) {
        limits.set(model, { rpm, rpd })
      }
    }
  })

  return limits
}

/**
 * Obtiene los límites para un modelo dado.
 * Busca primero en la config del usuario, luego usa defaults.
 */
function getModelLimits(model, runtimeConfig) {
  if (!parsedRateLimits) {
    parsedRateLimits = parseRateLimitsConfig(runtimeConfig?.geminiRateLimits || '')
  }

  if (parsedRateLimits.has(model)) {
    return parsedRateLimits.get(model)
  }

  return { rpm: DEFAULT_RPM, rpd: DEFAULT_RPD }
}

/**
 * Obtiene la clave del día actual en zona Pacific (los quotas de Google resetean a medianoche PT)
 */
function getDayKeyPacific() {
  const now = new Date()
  const ptString = now.toLocaleDateString('en-US', { timeZone: 'America/Los_Angeles' })
  return ptString
}

/**
 * Obtiene los segundos restantes hasta el próximo minuto
 */
function getSecondsUntilNextMinute() {
  return 60 - new Date().getSeconds()
}

/**
 * Obtiene el tiempo restante hasta medianoche Pacific Time
 */
function getTimeUntilMidnightPT() {
  const now = new Date()
  // Obtener la hora actual en Pacific Time
  const ptNow = new Date(now.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }))
  const midnight = new Date(ptNow)
  midnight.setDate(midnight.getDate() + 1)
  midnight.setHours(0, 0, 0, 0)

  const diffMs = midnight.getTime() - ptNow.getTime()
  const totalMinutes = Math.ceil(diffMs / 60000)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60

  return { hours, minutes, totalMinutes }
}

/**
 * Parsea la cadena de modelos separados por ";" y devuelve un array limpio
 */
export function parseModelList(modelString) {
  if (!modelString) return []
  return modelString
    .split(';')
    .map((m) => m.trim())
    .filter((m) => m.length > 0)
}

/**
 * Consulta la API de Gemini para obtener los modelos disponibles para la API key
 */
async function fetchAvailableModels(apiKey) {
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
    )
    if (!response.ok) {
      console.error('Error al consultar modelos disponibles:', response.status)
      return null
    }
    const data = await response.json()
    return (data.models || []).map((m) => m.name.replace('models/', ''))
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

  if (validatedModelsCache && now - validatedModelsCacheTime < CACHE_TTL) {
    const valid = configuredModels.filter((m) => validatedModelsCache.includes(m))
    if (valid.length > 0) return valid
  }

  const available = await fetchAvailableModels(apiKey)
  if (!available) {
    console.warn('No se pudo validar modelos, usando todos los configurados')
    return configuredModels
  }

  validatedModelsCache = available
  validatedModelsCacheTime = now

  const valid = configuredModels.filter((m) => available.includes(m))

  if (valid.length === 0) {
    console.warn(
      `Ninguno de los modelos configurados está disponible. Configurados: [${configuredModels.join(', ')}]. Disponibles: [${available.slice(0, 10).join(', ')}...]`,
    )
    return configuredModels
  }

  const invalid = configuredModels.filter((m) => !available.includes(m))
  if (invalid.length > 0) {
    console.warn(`Modelos no disponibles (ignorados): [${invalid.join(', ')}]`)
  }

  return valid
}

/**
 * Registra una petición al modelo en el minuto actual y día actual
 */
export function trackRequest(model) {
  const minuteKey = Math.floor(Date.now() / 60000)
  const dayKey = getDayKeyPacific()

  // Track por minuto
  if (!requestCountsPerMinute.has(model)) {
    requestCountsPerMinute.set(model, new Map())
  }
  const modelMinCounts = requestCountsPerMinute.get(model)
  // Limpiar minutos antiguos
  for (const [key] of modelMinCounts) {
    if (key < minuteKey - 1) modelMinCounts.delete(key)
  }
  modelMinCounts.set(minuteKey, (modelMinCounts.get(minuteKey) || 0) + 1)

  // Track por día
  if (!requestCountsPerDay.has(model)) {
    requestCountsPerDay.set(model, new Map())
  }
  const modelDayCounts = requestCountsPerDay.get(model)
  // Limpiar días antiguos (solo mantener hoy y ayer)
  for (const [key] of modelDayCounts) {
    if (key !== dayKey) modelDayCounts.delete(key)
  }
  modelDayCounts.set(dayKey, (modelDayCounts.get(dayKey) || 0) + 1)
}

/**
 * Obtiene el conteo de peticiones del modelo en el minuto actual
 */
export function getRequestCountPerMinute(model) {
  const minuteKey = Math.floor(Date.now() / 60000)
  const modelCounts = requestCountsPerMinute.get(model)
  if (!modelCounts) return 0
  return modelCounts.get(minuteKey) || 0
}

/**
 * Obtiene el conteo de peticiones del modelo en el día actual (Pacific Time)
 */
export function getRequestCountPerDay(model) {
  const dayKey = getDayKeyPacific()
  const modelCounts = requestCountsPerDay.get(model)
  if (!modelCounts) return 0
  return modelCounts.get(dayKey) || 0
}

// Compatibilidad con código existente
export function getRequestCount(model) {
  return getRequestCountPerMinute(model)
}

/**
 * Verifica si un modelo tiene capacidad disponible.
 * Un modelo NO tiene capacidad si está a 1 request del límite (por minuto O por día).
 */
export function hasAvailableCapacity(model, runtimeConfig) {
  const limits = getModelLimits(model, runtimeConfig)
  const usedRPM = getRequestCountPerMinute(model)
  const usedRPD = getRequestCountPerDay(model)

  // Está a 1 del límite por minuto
  if (usedRPM >= limits.rpm - 1) return false
  // Está a 1 del límite por día
  if (usedRPD >= limits.rpd - 1) return false

  return true
}

/**
 * Obtiene info de uso actual de un modelo para logging/diagnóstico
 */
export function getModelUsageInfo(model, runtimeConfig) {
  const limits = getModelLimits(model, runtimeConfig)
  const usedRPM = getRequestCountPerMinute(model)
  const usedRPD = getRequestCountPerDay(model)

  return {
    model,
    rpm: { used: usedRPM, limit: limits.rpm, remaining: limits.rpm - usedRPM },
    rpd: { used: usedRPD, limit: limits.rpd, remaining: limits.rpd - usedRPD },
  }
}

/**
 * Selecciona el primer modelo con capacidad disponible respetando el orden
 * definido en GEMINI_MODEL. El orden de la variable de entorno es la prioridad.
 * Si ninguno tiene capacidad, retorna null.
 */
export function selectBestModel(models, runtimeConfig) {
  if (models.length === 0) return null

  // Respetar el orden original: usar el primero que tenga capacidad
  for (const model of models) {
    if (hasAvailableCapacity(model, runtimeConfig)) return model
  }

  return null
}

/**
 * Obtiene los modelos restantes para fallback (excluyendo el seleccionado),
 * respetando el orden original de la variable de entorno.
 */
export function getFallbackModels(models, selectedModel, runtimeConfig) {
  return models.filter((m) => m !== selectedModel && hasAvailableCapacity(m, runtimeConfig))
}

/**
 * Genera un mensaje de espera amigable cuando todos los modelos están al límite.
 * Determina si es un límite por minuto (esperar segundos) o por día (esperar horas).
 */
export function getWaitMessage(models, runtimeConfig) {
  let shortestWaitType = 'day' // 'minute' o 'day'
  let allDayLimited = true

  for (const model of models) {
    const limits = getModelLimits(model, runtimeConfig)
    const usedRPM = getRequestCountPerMinute(model)
    const usedRPD = getRequestCountPerDay(model)

    // Si el modelo solo está limitado por minuto (no por día), la espera es corta
    if (usedRPD < limits.rpd - 1) {
      allDayLimited = false
    }

    // Si al menos un modelo solo necesita esperar el minuto
    if (usedRPM >= limits.rpm - 1 && usedRPD < limits.rpd - 1) {
      shortestWaitType = 'minute'
    }
  }

  if (!allDayLimited || shortestWaitType === 'minute') {
    const seconds = getSecondsUntilNextMinute()
    return `Límite de solicitudes por minuto alcanzado en todos los modelos. Reintenta en ${seconds} segundos.`
  }

  // Todos los modelos están al límite diario
  const { hours, minutes } = getTimeUntilMidnightPT()
  if (hours === 0) {
    return `Límite diario de solicitudes alcanzado en todos los modelos. Reintenta en ${minutes} minutos.`
  }
  return `Límite diario de solicitudes alcanzado en todos los modelos. Reintenta en ${hours} horas y ${minutes} minutos.`
}
