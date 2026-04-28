// Security headers globales aplicados a todas las respuestas.
// Ver §1.5 de planifica.md.
export default defineEventHandler((event) => {
  const headers = {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(self), microphone=(self), geolocation=(), payment=()',
    'X-DNS-Prefetch-Control': 'off',
    'Cross-Origin-Opener-Policy': 'same-origin',
  }

  if (process.env.NODE_ENV === 'production') {
    headers['Strict-Transport-Security'] = 'max-age=63072000; includeSubDomains; preload'
  }

  for (const [name, value] of Object.entries(headers)) {
    setResponseHeader(event, name, value)
  }
})
