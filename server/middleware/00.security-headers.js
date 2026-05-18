// Security headers globales aplicados a todas las respuestas.
// Ver §1.5 de planifica.md.
//
// CSP: defensa en profundidad contra XSS y data exfiltration.
//
// script-src incluye 'unsafe-inline' porque Nuxt 3 + @vite-pwa/nuxt
// inyectan scripts inline obligatorios:
//   1. El script sincrónico de tema en <head> (anti-flicker en cold
//      start, ver nuxt.config.ts:79-83).
//   2. `window.__NUXT__ = {...}` con el state hidratado del SSR.
//   3. Event handler inline `onload="this.media='all'"` en el link
//      de Google Fonts.
// Sin 'unsafe-inline' el bundle no se ejecuta, Supabase no se inicia
// y todas las peticiones a /api/* responden 401.
//
// Migrar a nonces (experimental.cspNonce + hook en Nitro) es follow-up
// — requiere generar nonce por request e inyectarlo a TODOS los scripts
// inline que Nuxt produce, incluido el chunk de SSR state.
//
// El resto del CSP sigue activo y aporta defensa real:
// - script-src sin 'https:' ni dominios externos → bloquea scripts
//   de origen arbitrario (un XSS no puede meter <script src="evil.com">).
// - sin 'unsafe-eval' → bloquea eval / new Function.
// - frame-ancestors 'none' → no clickjacking.
// - object-src 'none' → no <embed>/<object> con plugins.
// - base-uri 'self' → no relocación del documento base.
// - form-action 'self' → form submit no sale del origen.

const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
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
