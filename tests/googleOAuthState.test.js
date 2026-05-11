import { describe, it, expect, beforeAll } from 'vitest'
import crypto from 'node:crypto'

let signState, verifyState

beforeAll(async () => {
  process.env.ENCRYPTION_KEY = crypto.randomBytes(32).toString('base64')
  const mod = await import('../server/utils/googleOAuthState.js')
  signState = mod.signState
  verifyState = mod.verifyState
})

describe('googleOAuthState', () => {
  it('roundtrip de state válido', () => {
    const token = signState({ usuarioId: 'abc-123' })
    const claims = verifyState(token)
    expect(claims.usuarioId).toBe('abc-123')
  })

  it('state manipulado falla la verificación', () => {
    const token = signState({ usuarioId: 'abc-123' })
    const [payload, sig] = token.split('.')
    const tampered = `${payload}xxxx.${sig}`
    expect(() => verifyState(tampered)).toThrow()
  })

  it('state expirado falla', () => {
    const token = signState({ usuarioId: 'abc-123' }, { expSeconds: -1 })
    expect(() => verifyState(token)).toThrow(/expirado/i)
  })
})
