// Logger con redacción de datos sensibles.
// Ver §1.6 de planifica.md.

const SENSITIVE_KEYS = new Set([
  'authorization',
  'cookie',
  'apikey',
  'api_key',
  'apiKey',
  'token',
  'access_token',
  'refresh_token',
  'password',
  'secret',
  'service_role_key',
  'serviceRoleKey',
  'gemini_api_key',
  'geminiApiKey',
])

const SENSITIVE_PATTERNS = [
  /AIza[0-9A-Za-z\-_]{35}/g,
  /eyJ[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*/g,
  /sk-[A-Za-z0-9]{20,}/g,
  // Connection strings con credenciales embebidas (postgres/redis/mysql/mongo).
  // Drizzle/postgres pueden incluirlas en mensajes de error que terminan
  // en logs si no se redactan.
  /\b(?:postgres(?:ql)?|redis|mysql|mongodb):\/\/[^@\s]+:[^@\s]+@[^\s'"`]+/gi,
  // Bearer tokens en headers volcados a logs.
  /\bBearer\s+[A-Za-z0-9._\-]{20,}/gi,
  // GitHub PAT / OAuth secrets típicos.
  /\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{30,}/g,
]

function redactString(str) {
  if (typeof str !== 'string') return str
  let result = str
  for (const pattern of SENSITIVE_PATTERNS) {
    result = result.replace(pattern, '[REDACTED]')
  }
  return result
}

function redact(value, depth = 0) {
  if (depth > 6) return '[Truncated]'
  if (value == null) return value
  if (typeof value === 'string') return redactString(value)
  if (typeof value !== 'object') return value
  if (Array.isArray(value)) return value.map((v) => redact(v, depth + 1))

  const out = {}
  for (const [k, v] of Object.entries(value)) {
    if (SENSITIVE_KEYS.has(k.toLowerCase())) {
      out[k] = '[REDACTED]'
    } else {
      out[k] = redact(v, depth + 1)
    }
  }
  return out
}

function format(level, message, context) {
  const payload = {
    level,
    ts: new Date().toISOString(),
    message: redactString(String(message ?? '')),
  }
  if (context && typeof context === 'object') {
    payload.context = redact(context)
  }
  return payload
}

export const logger = {
  info(message, context) {
    console.log(JSON.stringify(format('info', message, context)))
  },
  warn(message, context) {
    console.warn(JSON.stringify(format('warn', message, context)))
  },
  error(message, context) {
    const safeContext = context && typeof context === 'object' ? { ...context } : context
    if (safeContext && safeContext.error instanceof Error) {
      safeContext.error = {
        name: safeContext.error.name,
        message: redactString(safeContext.error.message),
      }
    }
    console.error(JSON.stringify(format('error', message, safeContext)))
  },
}
