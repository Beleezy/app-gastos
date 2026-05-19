// Security headers globales aplicados a todas las respuestas.
// Ver §1.5 de planifica.md.
//
// CSP: defensa en profundidad contra XSS y data exfiltration.
//
// Esta versión introduce nonces por request + un canal Report-Only
// con la política "estricta" (sin 'unsafe-inline'). El header activo
// (Content-Security-Policy) sigue permitiendo 'unsafe-inline' porque
// Nuxt 3 + @vite-pwa/nuxt inyectan scripts inline que no podemos
// marcar todavía con nonce:
//   1. El script sincrónico de tema en <head> (anti-flicker).
//   2. `window.__NUXT__ = {...}` con el state hidratado del SSR.
//   3. Event handler inline `onload` en el link de Google Fonts.
//
// El canal Report-Only nos da visibilidad: los violators se reportan
// a /api/csp-report sin bloquear. Cuando los reports muestren que
// todos los scripts inline llevan el nonce correcto, se puede mover
// la política estricta al header principal (drop-in change).
//
// El nonce se expone como `event.context.cspNonce` para que un plugin
// futuro lo inyecte en scripts dinámicos.

import { randomBytes } from 'node:crypto'

function generateNonce() {
  return randomBytes(16).toString('base64')
}

function buildCsp({ nonce, reportOnly, reportUri }) {
  // Política base: aplica a ambos modos.
  const directives = {
    'default-src': ["'self'"],
    'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
    'font-src': ["'self'", 'https://fonts.gstatic.com', 'data:'],
    'img-src': ["'self'", 'data:', 'https:'],
    'connect-src': [
      "'self'",
      'https://*.supabase.co',
      'https://generativelanguage.googleapis.com',
    ],
    'media-src': ["'self'", 'blob:'],
    'worker-src': ["'self'", 'blob:'],
    'frame-ancestors': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
    'object-src': ["'none'"],
  }

  if (reportOnly) {
    // Política estricta: solo scripts con nonce o cargados dinámicamente
    // desde un script con nonce. Sin 'unsafe-inline'.
    directives['script-src'] = [
      "'self'",
      `'nonce-${nonce}'`,
      "'strict-dynamic'",
    ]
    if (reportUri) {
      directives['report-uri'] = [reportUri]
      directives['report-to'] = ['csp-endpoint']
    }
  } else {
    // Política activa: mantiene 'unsafe-inline' como fallback. Browsers
    // CSP3 que respeten 'strict-dynamic' lo ignorarían; pero no incluimos
    // 'strict-dynamic' aquí precisamente para no romper scripts inline.
    directives['script-src'] = [
      "'self'",
      "'unsafe-inline'",
      `'nonce-${nonce}'`,
    ]
  }

  return Object.entries(directives)
    .map(([d, vals]) => `${d} ${vals.join(' ')}`)
    .join('; ')
}

export default defineEventHandler((event) => {
  const nonce = generateNonce()
  // Disponible en event.context.cspNonce para plugins que inyecten
  // scripts en el HTML (futuro).
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
    'Content-Security-Policy': buildCsp({ nonce, reportOnly: false }),
    // Report-Only: canal de observabilidad para la política estricta.
    // Las violaciones se enviarán a /api/csp-report sin bloquear nada.
    'Content-Security-Policy-Report-Only': buildCsp({
      nonce,
      reportOnly: true,
      reportUri: '/api/csp-report',
    }),
    // Report-To: alternativa moderna a report-uri. Si el browser soporta
    // ambos, prefiere Report-To.
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
