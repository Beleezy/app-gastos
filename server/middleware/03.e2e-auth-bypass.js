// Bypass de auth para tests E2E.
// Solo activo cuando AMBOS:
//   - process.env.E2E_AUTH_BYPASS === '1'
//   - request lleva header X-E2E-Test-Token === process.env.E2E_TEST_TOKEN
//
// En producción NUNCA debe activarse. Verificación doble por seguridad.
// Ver §55 de planifica.md.

const E2E_USER_ID = '00000000-0000-0000-0000-000000000e2e'

export default defineEventHandler((event) => {
  if (process.env.E2E_AUTH_BYPASS !== '1') return
  if (process.env.NODE_ENV === 'production') return

  const expected = process.env.E2E_TEST_TOKEN
  if (!expected) return

  const got = getRequestHeader(event, 'x-e2e-test-token')
  if (got !== expected) return

  // Inyecta el usuario E2E en el contexto. getUsuarioFromEvent puede
  // chequear esto antes de llamar a Supabase.
  event.context.usuario = { id: E2E_USER_ID, email: 'e2e@test.local' }
  event.context.e2eBypass = true
})
