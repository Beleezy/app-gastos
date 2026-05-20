// Bypass de auth para pruebas manuales locales.
// Activo solo cuando:
//  - DEV_AUTH_BYPASS === '1'
//  - NODE_ENV !== 'production' Y VERCEL_ENV != 'production'/'preview'
//  - Header x-dev-auth-token coincide con DEV_AUTH_TOKEN (mínimo 16 chars)
//  - Header x-dev-user-id está presente
//
// El doble guard contra VERCEL_ENV cierra el agujero descrito en A5 del
// plan: un preview deploy que tenga NODE_ENV=development por accidente.

export default defineEventHandler((event) => {
  if (process.env.DEV_AUTH_BYPASS !== '1') return
  if (process.env.NODE_ENV === 'production') return
  if (process.env.VERCEL_ENV === 'production' || process.env.VERCEL_ENV === 'preview') return

  const expected = process.env.DEV_AUTH_TOKEN
  // Requerimos un token suficientemente largo para evitar configs
  // descuidadas (DEV_AUTH_TOKEN="abc") que serían trivialmente
  // adivinables si por error quedan activas en un entorno expuesto.
  if (!expected || expected.length < 16) return

  const token = getRequestHeader(event, 'x-dev-auth-token')
  const userId = getRequestHeader(event, 'x-dev-user-id')
  const userEmail = getRequestHeader(event, 'x-dev-user-email')

  if (token !== expected || !userId) return

  event.context.usuario = { id: userId, email: userEmail || null }
  event.context.e2eBypass = true
})
