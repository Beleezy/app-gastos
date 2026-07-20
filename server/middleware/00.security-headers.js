// Security headers globales aplicados a todas las respuestas.
// Ver §1.5 de planifica.md.
//
// CSP: defensa en profundidad contra XSS y data exfiltration.
//
// El header ACTIVO usa 'unsafe-inline' EXCLUSIVAMENTE — sin nonce ni
// hash. Esto es crítico: la spec CSP3 estipula que si hay un nonce o
// hash, el browser IGNORA 'unsafe-inline' (es opt-out implícito de la
// política antigua). Como Nuxt 3 + @vite-pwa/nuxt inyectan scripts
// inline que no podemos marcar (script de tema, __NUXT__, onload de
// Google Fonts), un nonce en el header activo rompe la hidratación.
//
// El nonce solo aparece en el canal Report-Only para observabilidad:
// los browsers reportan violaciones a la política estricta sin
// bloquearlas. Cuando todos los scripts inline lleven nonce
// (vía plugin Nuxt + custom SSR), se puede mover la política estricta
// al header activo.
//
// El nonce se expone como `event.context.cspNonce` para uso futuro
// (plugin que inyecte scripts dinámicos con nonce).

import { randomBytes } from 'node:crypto'

function generateNonce() {
  return randomBytes(16).toString('base64')
}

const COMMON_DIRECTIVES = {
  'default-src': ["'self'"],
  // Inter es auto-hospedada (public/fonts) — sin orígenes de Google Fonts.
  'style-src': ["'self'", "'unsafe-inline'"],
  'font-src': ["'self'", 'data:'],
  // blob: necesario para preview de fotos del flujo de voucher
  // (BotonCamara crea un blob URL via URL.createObjectURL).
  'img-src': ["'self'", 'data:', 'blob:', 'https:'],
  'connect-src': ["'self'", 'https://*.supabase.co', 'https://generativelanguage.googleapis.com'],
  'media-src': ["'self'", 'blob:'],
  'worker-src': ["'self'", 'blob:'],
  'frame-ancestors': ["'none'"],
  'base-uri': ["'self'"],
  'form-action': ["'self'"],
  'object-src': ["'none'"],
}

function serialize(directives) {
  return Object.entries(directives)
    .map(([d, vals]) => `${d} ${vals.join(' ')}`)
    .join('; ')
}

function buildActiveCsp() {
  // Política activa: 'unsafe-inline' sin nonce. Idéntica a la
  // pre-#37 — no rompe ningún script inline.
  return serialize({
    ...COMMON_DIRECTIVES,
    'script-src': ["'self'", "'unsafe-inline'"],
  })
}

function buildReportOnlyCsp({ nonce, reportUri }) {
  // Política estricta: solo nonce o cargado dinámicamente desde un
  // script con nonce. Sin 'unsafe-inline'. SOLO se aplica en modo
  // Report-Only — no bloquea, solo reporta.
  return serialize({
    ...COMMON_DIRECTIVES,
    'script-src': ["'self'", `'nonce-${nonce}'`, "'strict-dynamic'"],
    ...(reportUri ? { 'report-uri': [reportUri], 'report-to': ['csp-endpoint'] } : {}),
  })
}

export default defineEventHandler((event) => {
  const nonce = generateNonce()
  event.context.cspNonce = nonce

  const headers = {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy':
      'camera=(self), microphone=(self), geolocation=(), payment=(), interest-cohort=(), browsing-topics=()',
    'X-DNS-Prefetch-Control': 'off',
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Cross-Origin-Resource-Policy': 'same-origin',
    'Content-Security-Policy': buildActiveCsp(),
    'Content-Security-Policy-Report-Only': buildReportOnlyCsp({
      nonce,
      reportUri: '/api/csp-report',
    }),
    'Report-To': JSON.stringify({
      group: 'csp-endpoint',
      max_age: 10886400,
      endpoints: [{ url: '/api/csp-report' }],
    }),
  }

  if (process.env.NODE_ENV === 'production') {
    headers['Strict-Transport-Security'] = 'max-age=63072000; includeSubDomains; preload'
  }

  for (const [name, value] of Object.entries(headers)) {
    setResponseHeader(event, name, value)
  }
})
