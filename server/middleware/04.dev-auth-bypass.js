// Bypass de auth para pruebas manuales locales.
// Activo solo cuando:
//  - DEV_AUTH_BYPASS === '1'
//  - NODE_ENV !== 'production'
//  - Header x-dev-auth-token coincide con DEV_AUTH_TOKEN
//  - Header x-dev-user-id está presente

export default defineEventHandler((event) => {
  if (process.env.DEV_AUTH_BYPASS !== '1') return
  if (process.env.NODE_ENV === 'production') return

  const expected = process.env.DEV_AUTH_TOKEN
  if (!expected) return

  const token = getRequestHeader(event, 'x-dev-auth-token')
  const userId = getRequestHeader(event, 'x-dev-user-id')
  const userEmail = getRequestHeader(event, 'x-dev-user-email')

  if (token !== expected || !userId) return

  event.context.usuario = { id: userId, email: userEmail || null }
  event.context.e2eBypass = true
})
