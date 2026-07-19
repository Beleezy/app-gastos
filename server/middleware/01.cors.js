// CORS restringido: solo se aceptan peticiones cross-origin desde la
// propia app (orígenes incluidos en APP_PUBLIC_URL / ALLOWED_ORIGINS).
// Aplica solo a rutas /api/* — el resto del sitio (assets PWA, páginas)
// queda como served same-origin por Nuxt.
//
// Diseño:
// - Si la request NO trae header Origin → es same-origin (navegación o
//   fetch desde el propio host); se permite sin tocar headers CORS.
// - Si trae Origin y coincide con la allowlist → se reflejan los
//   headers Access-Control-* y se permite (incluido preflight).
// - Si trae Origin y NO coincide → se responde 403 (preflight también).
//
// En desarrollo (NODE_ENV !== 'production') se permite cualquier
// http://localhost:* / http://127.0.0.1:* / http://[::1]:* para no
// bloquear herramientas locales (Storybook, Playwright UI, etc.).

const ALLOWED_HEADERS = [
  'Content-Type',
  'Authorization',
  'X-Requested-With',
  'X-E2E-Test-Token',
  'X-Dev-Auth-Token',
  'X-Dev-User-Id',
  'X-Dev-User-Email',
].join(', ')

const ALLOWED_METHODS = 'GET, POST, PUT, PATCH, DELETE, OPTIONS'

let cachedAllowlist = null

function buildAllowlist() {
  if (cachedAllowlist) return cachedAllowlist
  const set = new Set()
  const candidates = [process.env.APP_PUBLIC_URL, ...(process.env.ALLOWED_ORIGINS || '').split(',')]
  for (const raw of candidates) {
    if (!raw) continue
    const trimmed = String(raw).trim().replace(/\/$/, '')
    if (!trimmed) continue
    try {
      const u = new URL(trimmed)
      set.add(`${u.protocol}//${u.host}`)
    } catch {
      // ignorar entradas mal formadas
    }
  }
  cachedAllowlist = set
  return set
}

function isLocalDevOrigin(origin) {
  try {
    const u = new URL(origin)
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return false
    const host = u.hostname
    return host === 'localhost' || host === '127.0.0.1' || host === '::1'
  } catch {
    return false
  }
}

function isAllowed(origin) {
  if (!origin) return true
  if (process.env.NODE_ENV !== 'production' && isLocalDevOrigin(origin)) return true
  const allowlist = buildAllowlist()
  if (allowlist.size === 0) {
    // Sin allowlist configurada en producción → política estricta: bloquear
    // todo cross-origin. Same-origin (sin header Origin) sigue permitido.
    return false
  }
  try {
    const u = new URL(origin)
    return allowlist.has(`${u.protocol}//${u.host}`)
  } catch {
    return false
  }
}

export default defineEventHandler((event) => {
  const url = event.node.req.url || ''
  if (!url.startsWith('/api/')) return

  const origin = getRequestHeader(event, 'origin')
  const method = (event.node.req.method || 'GET').toUpperCase()

  // Same-origin: nada que hacer.
  if (!origin) {
    if (method === 'OPTIONS') {
      // Preflight sin Origin no tiene sentido — responder 204 simple.
      setResponseStatus(event, 204)
      return ''
    }
    return
  }

  if (!isAllowed(origin)) {
    // Para preflight respondemos sin Access-Control-Allow-Origin → el
    // navegador rechaza la request real. Para requests reales devolvemos
    // 403 explícito.
    if (method === 'OPTIONS') {
      setResponseStatus(event, 403)
      return ''
    }
    throw createError({
      statusCode: 403,
      statusMessage: 'Forbidden',
      message: 'Origen no permitido',
    })
  }

  setResponseHeader(event, 'Access-Control-Allow-Origin', origin)
  setResponseHeader(event, 'Vary', 'Origin')
  setResponseHeader(event, 'Access-Control-Allow-Credentials', 'true')
  setResponseHeader(event, 'Access-Control-Allow-Methods', ALLOWED_METHODS)
  setResponseHeader(event, 'Access-Control-Allow-Headers', ALLOWED_HEADERS)
  setResponseHeader(event, 'Access-Control-Max-Age', '600')

  if (method === 'OPTIONS') {
    setResponseStatus(event, 204)
    return ''
  }
})
