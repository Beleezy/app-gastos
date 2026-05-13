// Security headers globales aplicados a todas las respuestas.
// Ver §1.5 de planifica.md.
//
// CSP: defensa en profundidad contra XSS y data exfiltration. La app
// es una PWA de finanzas que pinta texto del usuario y respuestas del
// LLM; un sanitizador roto downstream no debe traducirse en ejecución
// de script arbitrario. La lista de orígenes permite:
// - 'self': scripts/estilos/imagenes de la propia app
// - fonts.googleapis.com / fonts.gstatic.com: el preconnect/stylesheet
//   de Inter que se carga desde el HTML (ver nuxt.config.ts).
// - *.supabase.co: cliente Supabase Auth en el browser.
// - generativelanguage.googleapis.com: si en el futuro alguna llamada
//   al LLM se hace desde el cliente (hoy es solo server-side).
// - data:/https: para img-src para soportar avatares OAuth y QR locales.
// Tailwind exige 'unsafe-inline' en style-src; eliminar requeriría
// migrar a nonces, trabajo aparte.

const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  "img-src 'self' data: https:",
  "connect-src 'self' https://*.supabase.co https://generativelanguage.googleapis.com",
  "media-src 'self' blob:",
  "worker-src 'self' blob:",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join('; ')

export default defineEventHandler((event) => {
  const headers = {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy':
      'camera=(self), microphone=(self), geolocation=(), payment=(), interest-cohort=(), browsing-topics=()',
    'X-DNS-Prefetch-Control': 'off',
    'Cross-Origin-Opener-Policy': 'same-origin',
    // CORP same-origin: el browser bloquea cargas cross-origin de los
    // recursos servidos por la app. Para una PWA esto es lo deseado —
    // no exponemos APIs ni assets a sitios terceros.
    'Cross-Origin-Resource-Policy': 'same-origin',
    'Content-Security-Policy': CSP,
  }

  if (process.env.NODE_ENV === 'production') {
    headers['Strict-Transport-Security'] = 'max-age=63072000; includeSubDomains; preload'
  }

  for (const [name, value] of Object.entries(headers)) {
    setResponseHeader(event, name, value)
  }
})
